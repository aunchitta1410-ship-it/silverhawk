
import { NextResponse } from "next/server";
import {
  createHash,
  randomBytes,
  randomInt,
} from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { saveBookingPickup } from "@/lib/booking-pickup";
import { getTourDisplayCode } from "@/lib/tour-code";
import { readJsonStorage } from "@/lib/serverless-store";

export const runtime = "nodejs";

type GuestInput = {
  title?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  guestType?: string;
  dateOfBirth?: string;
  dietaryRequirements?: string[];
  allergies?: string[];
  otherRequests?: string;
};

type BookingRequest = {
  tourId?: number | string;
  date?: string;
  pdpaAcknowledged?: boolean;
  privacyPolicyVersion?: string;
  guests?: GuestInput[];
  pickupRequired?: boolean | string;
  transferType?: string;
  pickupArea?: string;
  meetingPoint?: string;
  meetingTime?: string;
  pickupNotes?: string;
  hotelAddress?: string;
  roomNumber?: string;
  ticketTier?: string;
  addonIds?: string[] | string;
  addonTotal?: number | string;
  customBookingData?: Record<string, string> | string;
  extraDynamicFields?: any[] | string;
};

type NormalizedGuest = {
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  nationality: string;
  guest_type: string;
  date_of_birth: string;
  dietary_requirements: string[];
  allergies: string[];
  other_requests: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUEST_TYPES = new Set(["Adult", "Child", "Infant"]);
const BOOKING_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function createAccessToken(): string {
  return randomBytes(32).toString("hex");
}

function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createBookingId(tourCode: string, travelDate: string): string {
  const datePart = (travelDate || "").replaceAll("-", "");

  const randomPart = Array.from(
    { length: 4 },
    () => BOOKING_ID_CHARS[randomInt(BOOKING_ID_CHARS.length)]
  ).join("");

  return `${tourCode}-${datePart}-${randomPart}`;
}

export async function POST(request: Request) {
  let createdBookingId: number | null = null;

  try {
    let body: BookingRequest;

    try {
      const parsed: unknown = await request.json();

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json(
          { success: false, error: "Invalid request body" },
          { status: 400 }
        );
      }

      body = parsed as BookingRequest;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const rawTourId = body.tourId;
    const tourId =
      typeof rawTourId === "number"
        ? rawTourId
        : typeof rawTourId === "string" && /^\d+$/.test(rawTourId.trim())
          ? Number(rawTourId.trim())
          : NaN;

    if (!Number.isSafeInteger(tourId) || tourId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid tour ID" },
        { status: 400 }
      );
    }

    const travelDate = normalizeString(body.date);

    if (!isValidDate(travelDate)) {
      return NextResponse.json(
        { success: false, error: "Invalid travel date" },
        { status: 400 }
      );
    }

    if (body.pdpaAcknowledged !== true) {
      return NextResponse.json(
        { success: false, error: "PDPA consent is required" },
        { status: 400 }
      );
    }

    const privacyPolicyVersion = normalizeString(body.privacyPolicyVersion);

    if (!privacyPolicyVersion) {
      return NextResponse.json(
        { success: false, error: "Privacy Policy version is required" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(body.guests) ||
      body.guests.length < 1 ||
      body.guests.length > 20 ||
      body.guests.some(
        (guest) => !guest || typeof guest !== "object" || Array.isArray(guest)
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid guest list" },
        { status: 400 }
      );
    }

    const guests: NormalizedGuest[] = body.guests.map((guest) => ({
      title: normalizeString(guest.title),
      first_name: normalizeString(guest.firstName),
      last_name: normalizeString(guest.lastName),
      phone: normalizeString(guest.phone),
      email: normalizeString(guest.email).toLowerCase(),
      nationality: normalizeString(guest.nationality),
      guest_type: normalizeString(guest.guestType),
      date_of_birth: normalizeString(guest.dateOfBirth),
      dietary_requirements: normalizeStringArray(guest.dietaryRequirements),
      allergies: normalizeStringArray(guest.allergies),
      other_requests: normalizeString(guest.otherRequests),
    }));

    for (const [index, guest] of guests.entries()) {
      if (
        !guest.first_name ||
        !guest.last_name ||
        !guest.nationality ||
        !GUEST_TYPES.has(guest.guest_type)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Please check the required fields for guest ${index + 1}`,
          },
          { status: 400 }
        );
      }

      if (
        guest.first_name.length > 100 ||
        guest.last_name.length > 100 ||
        guest.nationality.length > 100 ||
        guest.phone.length > 50 ||
        guest.email.length > 254
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid guest information for guest ${index + 1}`,
          },
          { status: 400 }
        );
      }

      if (guest.email && !EMAIL_REGEX.test(guest.email)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid email for guest ${index + 1}`,
          },
          { status: 400 }
        );
      }

      if (guest.date_of_birth && !isValidDate(guest.date_of_birth)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid date of birth for guest ${index + 1}`,
          },
          { status: 400 }
        );
      }
    }

    const leadGuest = guests[0];

    if (!leadGuest.email || !EMAIL_REGEX.test(leadGuest.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid email for the lead passenger",
        },
        { status: 400 }
      );
    }

    if (!leadGuest.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a phone number for the lead passenger",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .select("id, title_en, title_zh")
      .eq("id", tourId)
      .maybeSingle();

    if (tourError) {
      console.error("Tour lookup failed:", tourError);
      return NextResponse.json(
        { success: false, error: "Unable to verify the selected tour" },
        { status: 500 }
      );
    }

    if (!tour) {
      return NextResponse.json(
        { success: false, error: "Selected tour was not found" },
        { status: 400 }
      );
    }

    const accessToken = createAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    // Resolve Tour ID Code (e.g. U-Phi-1, I-One-1)
    let tourCode = String(tourId);
    try {
      const extData = await readJsonStorage<Record<string, any>>(
        "tour_extended.json",
        {},
        "tour_extended"
      );
      const tourExt = extData[String(tourId)];
      tourCode = getTourDisplayCode(tour, tourExt, tourId);
    } catch (e) {
      console.warn("Could not resolve extended tour code:", e);
    }

    let insertedBooking: { id: number; bookingId: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const bookingIdDisplay = createBookingId(tourCode, travelDate);

      const pickupSummary = body.transferType
        ? `Transfer: ${body.transferType}${body.pickupArea ? ` (${body.pickupArea})` : ""}${body.pickupNotes ? ` - ${body.pickupNotes}` : ""}`
        : null;

      const { data, error } = await supabase
        .from("Bookings")
        .insert({
          tour_id: tourId,
          travel_date: travelDate,
          customer_name: `${leadGuest.first_name} ${leadGuest.last_name}`,
          customer_email: leadGuest.email,
          guests: guests.length,
          status: "pending",
          pdpa_acknowledged: true,
          pdpa_acknowledged_at: new Date().toISOString(),
          privacy_policy_version: privacyPolicyVersion,
          access_token_hash: accessTokenHash,
          booking_code: bookingIdDisplay,
          admin_remark: pickupSummary,
        })
        .select("id")
        .single();

      if (!error && data) {
        insertedBooking = {
          id: Number(data.id),
          bookingId: bookingIdDisplay,
        };

        const isPickupYes =
          body.pickupRequired === true ||
          body.pickupRequired === "yes" ||
          body.transferType === "Hotel pick-up";

        let customDataObj: Record<string, string> | undefined;
        try {
          if (body.customBookingData) {
            customDataObj =
              typeof body.customBookingData === "string"
                ? JSON.parse(body.customBookingData)
                : body.customBookingData;
          }
        } catch {}

        let extraFieldsArr: any[] | undefined;
        try {
          if (body.extraDynamicFields) {
            extraFieldsArr =
              typeof body.extraDynamicFields === "string"
                ? JSON.parse(body.extraDynamicFields)
                : body.extraDynamicFields;
          }
        } catch {}

        await saveBookingPickup({
          bookingId: insertedBooking.id,
          bookingCode: bookingIdDisplay,
          transferType: body.transferType || (isPickupYes ? "Hotel pick-up" : "No Transfer"),
          pickupRequired: isPickupYes,
          pickupArea: normalizeString(body.pickupArea),
          meetingPoint: normalizeString(body.meetingPoint),
          meetingTime: normalizeString(body.meetingTime),
          pickupNotes: normalizeString(body.pickupNotes),
          hotelAddress: normalizeString(body.hotelAddress || body.pickupNotes),
          roomNumber: normalizeString(body.roomNumber),
          ticketTier: normalizeString(body.ticketTier),
          addonIds: Array.isArray(body.addonIds)
            ? body.addonIds
            : typeof body.addonIds === "string"
            ? body.addonIds.split(",").filter(Boolean)
            : undefined,
          addonTotal: Number(body.addonTotal || 0),
          customBookingData: customDataObj,
          extraDynamicFields: extraFieldsArr,
        });

        break;
      }

      const isBookingIdConflict =
        error?.code === "23505" && /booking_code/i.test(error.message);

      if (isBookingIdConflict) continue;

      console.error("Booking insert failed:", error);

      return NextResponse.json(
        { success: false, error: "Unable to create booking" },
        { status: 500 }
      );
    }

    if (!insertedBooking) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not generate a unique Booking ID. Please try again.",
        },
        { status: 500 }
      );
    }

    createdBookingId = insertedBooking.id;

    const guestRows = guests.map((guest, index) => ({
      booking_id: createdBookingId,
      guest_number: index + 1,
      title: guest.title || null,
      first_name: guest.first_name,
      last_name: guest.last_name,
      phone: guest.phone || null,
      email: guest.email || null,
      nationality: guest.nationality || null,
      guest_type: guest.guest_type,
      date_of_birth: guest.date_of_birth || null,
      dietary_requirements: guest.dietary_requirements,
      allergies: guest.allergies,
      other_requests: guest.other_requests || null,
    }));

    const { error: guestsError } = await supabase
      .from("booking_guests")
      .insert(guestRows);

    if (guestsError) {
      console.error("Guest insert failed:", guestsError);

      const { error: rollbackError } = await supabase
        .from("Bookings")
        .delete()
        .eq("id", createdBookingId);

      if (rollbackError) {
        console.error("Booking rollback failed:", rollbackError);
      }

      createdBookingId = null;

      return NextResponse.json(
        {
          success: false,
          error: "Unable to save guest information. Please try again.",
        },
        { status: 500 }
      );
    }

    let emailSent = false;

    try {
      await sendBookingConfirmationEmail({
        to: leadGuest.email,
        bookingId: insertedBooking.bookingId,
        tourName: tour.title_en ?? `Tour ${tourId}`,
        travelDate,
        guestCount: guests.length,
        accessToken,
      });

      emailSent = true;
    } catch (emailError) {
      console.error("Booking confirmation email failed:", {
        bookingId: insertedBooking.bookingId,
        error:
          emailError instanceof Error
            ? emailError.message
            : "Unknown email error",
      });
    }

    const displayBookingCode = insertedBooking.bookingId || `BK-${insertedBooking.id}`;

    return NextResponse.json(
      {
        success: true,
        bookingId: displayBookingCode,
        bookingDisplayId: displayBookingCode,
        dbId: insertedBooking.id,
        accessToken,
        emailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected booking API error:", error);

    return NextResponse.json(
      { success: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
