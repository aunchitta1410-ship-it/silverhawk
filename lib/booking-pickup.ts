import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type BookingPickupDetails = {
  bookingId: number | string;
  bookingCode?: string;
  transferType: "Hotel pick-up" | "No Transfer" | string;
  pickupRequired: boolean;
  pickupArea?: string;
  meetingPoint?: string;
  meetingTime?: string;
  pickupNotes?: string;
  hotelAddress?: string;
  roomNumber?: string;
  ticketTier?: string;
  addonIds?: string[];
  addonTotal?: number;
  customBookingData?: Record<string, string>;
  extraDynamicFields?: { id: string; key: string; value: string }[];
  adminInternalNotes?: { id: string; key: string; value: string; addedAt: string }[];
  updatedAt?: string;
};

export async function getBookingPickup(
  bookingId: number | string
): Promise<BookingPickupDetails | null> {
  try {
    const data = await readJsonStorage<Record<string, BookingPickupDetails>>(
      "booking_pickups.json",
      {},
      "booking_pickups"
    );
    const key = String(bookingId);
    if (data[key]) return data[key];
    const clean = key.replace(/^BK-/i, "").trim();
    if (data[clean]) return data[clean];
    return null;
  } catch (error) {
    console.error("Error reading booking pickup:", error);
    return null;
  }
}

export async function saveBookingPickup(
  details: BookingPickupDetails
): Promise<void> {
  try {
    const data = await readJsonStorage<Record<string, BookingPickupDetails>>(
      "booking_pickups.json",
      {},
      "booking_pickups"
    );
    const key = String(details.bookingId);
    const existing = data[key] || (details.bookingCode ? data[details.bookingCode] : undefined);
    data[key] = {
      ...(existing || {}),
      ...details,
      updatedAt: new Date().toISOString(),
    };
    if (details.bookingCode) {
      data[details.bookingCode] = data[key];
    }
    await writeJsonStorage("booking_pickups.json", data, "booking_pickups");
  } catch (error) {
    console.error("Error saving booking pickup:", error);
  }
}

export async function addBookingAdminNote(
  bookingId: number | string,
  key: string,
  value: string
): Promise<BookingPickupDetails | null> {
  try {
    const data = await readJsonStorage<Record<string, BookingPickupDetails>>(
      "booking_pickups.json",
      {},
      "booking_pickups"
    );
    const idKey = String(bookingId);
    const existing = data[idKey] || {
      bookingId,
      transferType: "Standard",
      pickupRequired: false,
    };

    const notes = existing.adminInternalNotes || [];
    notes.push({
      id: `note_${Date.now()}`,
      key: key.trim(),
      value: value.trim(),
      addedAt: new Date().toISOString(),
    });

    existing.adminInternalNotes = notes;
    existing.updatedAt = new Date().toISOString();
    data[idKey] = existing;

    await writeJsonStorage("booking_pickups.json", data, "booking_pickups");
    return existing;
  } catch (error) {
    console.error("Error adding admin note:", error);
    return null;
  }
}

