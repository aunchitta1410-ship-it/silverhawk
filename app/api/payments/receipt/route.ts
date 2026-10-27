import { NextResponse } from "next/server";
import {
  savePaymentReceipt,
  getPaymentReceiptByBookingId,
} from "@/lib/payment-receipt";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id") || searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    const receipt = await getPaymentReceiptByBookingId(bookingId);
    return NextResponse.json({ receipt });
  } catch (err) {
    console.error("Get receipt error:", err);
    return NextResponse.json({ error: "Failed to fetch receipt" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = body.bookingId || body.booking_id;
    const amount = body.amount ?? body.transfer_amount;
    const paymentMethod = body.paymentMethod || body.payment_method;
    const slipUrl = body.slipUrl || body.slip_url || body.receipt_url;
    const slipFilename = body.slipFilename || body.slip_filename;
    const customerName = body.customerName || body.customer_name;
    const customerEmail = body.customerEmail || body.customer_email;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    let dbBookingId = Number(bookingId);
    if (!Number.isSafeInteger(dbBookingId) || dbBookingId <= 0) {
      const cleanId = String(bookingId).replace(/^BK-/i, "").trim();
      if (/^\d+$/.test(cleanId)) {
        dbBookingId = Number(cleanId);
      } else {
        try {
          const admin = createAdminClient();
          const { data } = await admin
            .from("Bookings")
            .select("id")
            .eq("booking_code", String(bookingId))
            .maybeSingle();
          if (data) dbBookingId = Number(data.id);
        } catch {}
      }
    }

    const record = await savePaymentReceipt({
      booking_id: dbBookingId || String(bookingId),
      amount: Number(amount || 0),
      payment_method: paymentMethod || "qr_payment",
      slip_url: slipUrl || "/images/sample-slip.png",
      slip_filename: slipFilename || "slip.jpg",
      customer_name: customerName,
      customer_email: customerEmail,
      status: "pending_verification",
    });

    return NextResponse.json({ success: true, receipt: record });
  } catch (err) {
    console.error("Save receipt error:", err);
    return NextResponse.json({ error: "Failed to save receipt" }, { status: 500 });
  }
}
