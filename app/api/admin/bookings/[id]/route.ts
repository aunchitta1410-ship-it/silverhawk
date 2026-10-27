import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingDecisionEmail } from "@/lib/email";
import { addAuditLog } from "@/lib/audit-log";
import { saveBookingPickup } from "@/lib/booking-pickup";
import { getAdminEmail } from "@/lib/admin-email";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Verify the logged-in user.
    const sessionClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      );
    }

    // 2. Verify admin permission.
    const adminClient = createAdminClient();

    const { data: adminRecord, error: adminError } =
      await adminClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (adminError) {
      console.error("Admin permission check failed:", adminError);

      return NextResponse.json(
        { error: "Unable to verify admin permission." },
        { status: 500 }
      );
    }

    if (!adminRecord) {
      return NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 }
      );
    }

    const adminEmail = await getAdminEmail(user.email);

    // 3. Validate booking ID.
    const { id } = await context.params;

    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id))
    ) {
      return NextResponse.json(
        { error: "Invalid booking ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    // A0. Add Dynamic Custom Field / Note Case
    if (body.action === "add_note" && body.key && body.value) {
      const { addBookingAdminNote } = await import("@/lib/booking-pickup");
      const updatedPickup = await addBookingAdminNote(
        Number(id),
        String(body.key),
        String(body.value)
      );
      await addAuditLog({
        action: "EDIT_BOOKING",
        adminEmail,
        targetType: "booking",
        targetId: Number(id),
        description: `Added dynamic field to booking #${id}: ${body.key} = ${body.value}`,
      });
      return NextResponse.json({ success: true, pickup: updatedPickup });
    }

    // A. Full Booking Edit Case
    if (body.action === "edit" || body.isFullEdit) {
      const updateFields: Record<string, unknown> = {};

      if (typeof body.customer_name === "string") updateFields.customer_name = body.customer_name.trim();
      if (typeof body.customer_email === "string") updateFields.customer_email = body.customer_email.trim();
      if (typeof body.travel_date === "string") updateFields.travel_date = body.travel_date.trim();
      if (body.guests != null && !Number.isNaN(Number(body.guests))) updateFields.guests = Number(body.guests);
      if (typeof body.admin_remark === "string") updateFields.admin_remark = body.admin_remark.trim();
      if (typeof body.status === "string" && ["pending", "approved", "paid", "cancelled", "rejected"].includes(body.status.toLowerCase())) {
        updateFields.status = body.status.toLowerCase();
      }

      const { data: updatedBooking, error: editError } = await adminClient
        .from("Bookings")
        .update(updateFields)
        .eq("id", Number(id))
        .select("id, booking_code, customer_name, customer_email, tour_id, travel_date, guests, status")
        .maybeSingle();

      if (editError) {
        console.error("Booking edit failed:", editError);
        return NextResponse.json(
          { error: "Unable to edit booking details." },
          { status: 500 }
        );
      }

      if (!updatedBooking) {
        return NextResponse.json(
          { error: "Booking not found." },
          { status: 404 }
        );
      }

      // If pickup information was updated
      if (body.pickup && typeof body.pickup === "object") {
        await saveBookingPickup({
          bookingId: updatedBooking.id,
          bookingCode: updatedBooking.booking_code || String(updatedBooking.id),
          transferType: body.pickup.transferType || "Hotel pick-up",
          pickupRequired: Boolean(body.pickup.pickupRequired),
          pickupArea: body.pickup.pickupArea || "",
          meetingPoint: body.pickup.meetingPoint || "",
          meetingTime: body.pickup.meetingTime || "",
          hotelAddress: body.pickup.hotelAddress || "",
          roomNumber: body.pickup.roomNumber || "",
          pickupNotes: body.pickup.pickupNotes || "",
        });
      }

      // Record Audit Log
      await addAuditLog({
        action: "EDIT_BOOKING",
        adminEmail,
        targetType: "booking",
        targetId: updatedBooking.id,
        description: `Edited booking #${updatedBooking.booking_code || id} (Status: ${updatedBooking.status}, Travel Date: ${updatedBooking.travel_date})`,
        metadata: { updatedFields: Object.keys(updateFields) },
      });

      return NextResponse.json({
        success: true,
        booking: updatedBooking,
        message: "Booking updated successfully.",
      });
    }

    // B. Status Action Case (Approve / Cancel)
    const newStatus = body?.status;

    if (!["approved", "cancelled", "rejected"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Status must be approved, cancelled, or rejected." },
        { status: 400 }
      );
    }

    const rejectReason =
      typeof body.rejectReason === "string"
        ? body.rejectReason.trim()
        : "";

    const now = new Date().toISOString();

    const updateData =
      newStatus === "approved"
        ? {
            status: "approved",
            admin_reviewed_at: now,
            approved_at: now,
          }
        : {
            status: newStatus,
            admin_reviewed_at: now,
            ...(rejectReason ? { admin_remark: `Cancellation reason: ${rejectReason}` } : {}),
          };

    const { data: updatedBooking, error: updateError } =
      await adminClient
        .from("Bookings")
        .update(updateData)
        .eq("id", Number(id))
        .select(`
          id,
          booking_code,
          customer_name,
          customer_email,
          tour_id,
          travel_date,
          guests
        `)
        .maybeSingle();

    if (updateError) {
      console.error("Booking update failed:", updateError);

      return NextResponse.json(
        { error: "Unable to update booking status." },
        { status: 500 }
      );
    }

    if (!updatedBooking) {
      return NextResponse.json(
        {
          error: "Booking not found.",
        },
        { status: 404 }
      );
    }

    // Record audit log
    await addAuditLog({
      action: newStatus === "approved" ? "APPROVE_BOOKING" : "CANCEL_BOOKING",
      adminEmail,
      targetType: "booking",
      targetId: updatedBooking.id,
      description: `${newStatus === "approved" ? "Approved" : "Cancelled"} booking #${updatedBooking.booking_code || id}${rejectReason ? ` (Reason: ${rejectReason})` : ""}`,
    });

    // Send decision email
    let emailSent = false;
    let emailError: string | undefined;
    let emailId: string | undefined;

    try {
      if (updatedBooking.customer_email) {
        const { data: tour } =
          await adminClient
            .from("tours")
            .select("title_en")
            .eq("id", updatedBooking.tour_id)
            .maybeSingle();

        const result = await sendBookingDecisionEmail({
          to: updatedBooking.customer_email,
          customerName: updatedBooking.customer_name || "Customer",
          bookingId:
            updatedBooking.booking_code ||
            String(updatedBooking.id),
          tourName: tour?.title_en || "Silver Hawk Tour",
          travelDate: String(updatedBooking.travel_date),
          guestCount: Number(updatedBooking.guests),
          status: newStatus as "approved" | "cancelled" | "rejected",
          rejectReason:
            newStatus !== "approved"
              ? rejectReason
              : undefined,
        });

        emailId = result.emailId;
        emailSent = Boolean(emailId);
      }
    } catch (error) {
      emailError =
        error instanceof Error
          ? error.message
          : "Unable to send booking decision email.";

      console.error(
        "Booking decision email failed:",
        emailError
      );
    }

    return NextResponse.json({
      success: true,
      bookingId: updatedBooking.id,
      bookingCode:
        updatedBooking.booking_code ||
        String(updatedBooking.id),
      status: newStatus,
      emailSent,
      ...(emailId ? { emailId } : {}),
      ...(emailError ? { emailError } : {}),
    });
  } catch (error) {
    console.error("Admin booking API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
