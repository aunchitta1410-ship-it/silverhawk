import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";
import { getAdminEmail } from "@/lib/admin-email";

export type PaymentReceipt = {
  id: string;
  booking_id: number | string;
  payment_id?: number;
  payment_method: "qr_payment" | "card" | "bank_transfer" | string;
  amount: number;
  slip_url: string;
  slip_filename?: string;
  uploaded_at: string;
  status: "pending_verification" | "verified" | "rejected";
  verified_at?: string;
  verified_by?: string;
  reject_reason?: string;
  notes?: string;
  customer_name?: string;
  customer_email?: string;
};

async function readReceipts(): Promise<Record<string, PaymentReceipt>> {
  try {
    return await readJsonStorage<Record<string, PaymentReceipt>>(
      "payment_receipts.json",
      {},
      "payment_receipts"
    );
  } catch {
    return {};
  }
}

async function writeReceipts(data: Record<string, PaymentReceipt>): Promise<void> {
  try {
    await writeJsonStorage("payment_receipts.json", data, "payment_receipts");
  } catch (err) {
    console.error("Failed to write payment receipts store:", err);
  }
}

export async function savePaymentReceipt(
  receipt: Omit<PaymentReceipt, "id" | "uploaded_at" | "status"> & {
    id?: string;
    status?: PaymentReceipt["status"];
  }
): Promise<PaymentReceipt> {
  const store = await readReceipts();
  const id = receipt.id || `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const record: PaymentReceipt = {
    ...receipt,
    id,
    uploaded_at: new Date().toISOString(),
    status: receipt.status || "pending_verification",
  };

  store[String(record.booking_id)] = record;
  store[id] = record;
  await writeReceipts(store);

  // Sync to Supabase payments table
  try {
    const admin = createAdminClient();
    const dbStatus = record.status === "verified" ? "paid" : "pending";

    // Check if payments already exist
    let numericBookingId = /^\d+$/.test(String(record.booking_id)) ? Number(record.booking_id) : null;
    if (!numericBookingId) {
      const { data: b } = await admin
        .from("Bookings")
        .select("id")
        .eq("booking_code", String(record.booking_id))
        .maybeSingle();
      if (b) numericBookingId = b.id;
    }

    if (numericBookingId) {
      const { data: existingRows } = await admin
        .from("payments")
        .select("id")
        .eq("booking_id", numericBookingId);

      if (existingRows && existingRows.length > 0) {
        await admin
          .from("payments")
          .update({
            payment_method: record.payment_method,
            amount: record.amount,
            status: dbStatus,
          })
          .eq("booking_id", numericBookingId);
      } else {
        await admin.from("payments").insert({
          booking_id: numericBookingId,
          status: dbStatus,
          payment_method: record.payment_method,
          amount: record.amount,
        });
      }

      // Also update Bookings table to record receipt uploaded awaiting review
      if (record.status !== "verified") {
        await admin
          .from("Bookings")
          .update({
            status: "pending",
            admin_remark: `Payment receipt uploaded (${record.payment_method || "PromptPay QR"}). Awaiting admin review.`,
          })
          .eq("id", numericBookingId);
      }
    }
  } catch (err) {
    console.warn("Could not sync payment receipt to Supabase payments table:", err);
  }

  return record;
}

export async function getPaymentReceiptByBookingId(
  bookingId: number | string
): Promise<PaymentReceipt | null> {
  const store = await readReceipts();
  const direct = store[String(bookingId)];
  if (direct) return direct;

  const clean = String(bookingId).replace(/^BK-/i, "").trim();
  if (store[clean]) return store[clean];

  return null;
}

export async function verifyPaymentReceipt(
  bookingId: number | string,
  adminEmail?: string
): Promise<PaymentReceipt | null> {
  const resolvedAdminEmail = await getAdminEmail(adminEmail);
  const store = await readReceipts();
  const key = String(bookingId);
  let record = store[key];

  if (!record) {
    const found = Object.values(store).find(
      (r) =>
        String(r.booking_id) === String(bookingId) ||
        String(r.id) === String(bookingId)
    );
    if (found) {
      record = found;
    } else {
      record = {
        id: `rcpt_${Date.now()}`,
        booking_id: bookingId,
        payment_method: "bank_transfer",
        amount: 0,
        slip_url: "",
        uploaded_at: new Date().toISOString(),
        status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: resolvedAdminEmail,
      };
    }
  }

  record.status = "verified";
  record.verified_at = new Date().toISOString();
  record.verified_by = resolvedAdminEmail;

  store[key] = record;
  if (record.id) store[record.id] = record;
  if (record.booking_id) store[String(record.booking_id)] = record;
  await writeReceipts(store);

  // Also update Supabase Bookings and Payments tables
  try {
    const admin = createAdminClient();
    let numericBookingId = /^\d+$/.test(String(bookingId)) ? Number(bookingId) : null;

    if (!numericBookingId) {
      const { data: b } = await admin
        .from("Bookings")
        .select("id")
        .eq("booking_code", String(bookingId))
        .maybeSingle();
      if (b) numericBookingId = b.id;
    }

    if (numericBookingId) {
      await admin
        .from("Bookings")
        .update({
          status: "paid",
          approved_at: new Date().toISOString(),
          admin_reviewed_at: new Date().toISOString(),
          admin_remark: `Payment receipt verified & approved by ${resolvedAdminEmail}`,
        })
        .eq("id", numericBookingId);

      const { data: existingPayments } = await admin
        .from("payments")
        .select("id")
        .eq("booking_id", numericBookingId);

      if (existingPayments && existingPayments.length > 0) {
        await admin
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("booking_id", numericBookingId);
      } else {
        await admin.from("payments").insert({
          booking_id: numericBookingId,
          status: "paid",
          paid_at: new Date().toISOString(),
          amount: record.amount || 0,
          payment_method: record.payment_method || "bank_transfer",
        });
      }
    }
  } catch (err) {
    console.warn("Could not update Supabase on receipt verification:", err);
  }

  return record;
}

export async function rejectPaymentReceipt(
  bookingId: number | string,
  reason: string,
  adminEmail?: string
): Promise<PaymentReceipt | null> {
  const resolvedAdminEmail = await getAdminEmail(adminEmail);
  const store = await readReceipts();
  const key = String(bookingId);
  let record = store[key];

  if (!record) {
    const found = Object.values(store).find(
      (r) =>
        String(r.booking_id) === String(bookingId) ||
        String(r.id) === String(bookingId)
    );
    if (found) {
      record = found;
    } else {
      record = {
        id: `rcpt_${Date.now()}`,
        booking_id: bookingId,
        payment_method: "bank_transfer",
        amount: 0,
        slip_url: "",
        uploaded_at: new Date().toISOString(),
        status: "rejected",
        reject_reason: reason,
        verified_at: new Date().toISOString(),
        verified_by: resolvedAdminEmail,
      };
    }
  }

  record.status = "rejected";
  record.reject_reason = reason;
  record.verified_at = new Date().toISOString();
  record.verified_by = resolvedAdminEmail;

  store[key] = record;
  if (record.id) store[record.id] = record;
  if (record.booking_id) store[String(record.booking_id)] = record;
  await writeReceipts(store);

  // Update Supabase Bookings and Payments tables
  try {
    const admin = createAdminClient();
    let numericBookingId = /^\d+$/.test(String(bookingId)) ? Number(bookingId) : null;

    if (!numericBookingId) {
      const { data: b } = await admin
        .from("Bookings")
        .select("id")
        .eq("booking_code", String(bookingId))
        .maybeSingle();
      if (b) numericBookingId = b.id;
    }

    if (numericBookingId) {
      // 1. Update all payments table records to rejected
      const { data: existingPayments } = await admin
        .from("payments")
        .select("id")
        .eq("booking_id", numericBookingId);

      if (existingPayments && existingPayments.length > 0) {
        await admin
          .from("payments")
          .update({
            status: "rejected",
          })
          .eq("booking_id", numericBookingId);
      } else {
        await admin.from("payments").insert({
          booking_id: numericBookingId,
          status: "rejected",
          amount: record.amount || 0,
          payment_method: record.payment_method || "bank_transfer",
        });
      }

      // 2. Update Bookings table to rejected with admin remark
      await admin
        .from("Bookings")
        .update({
          status: "rejected",
          admin_remark: `Payment receipt rejected: ${reason}`,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq("id", numericBookingId);
    }
  } catch (err) {
    console.warn("Could not update Supabase on receipt rejection:", err);
  }

  return record;
}
