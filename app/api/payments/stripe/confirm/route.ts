import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getStripeServer } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { savePaymentReceipt } from "@/lib/payment-receipt";
import { addAuditLog } from "@/lib/audit-log";
import { getBookingPickup } from "@/lib/booking-pickup";
import { sendVoucherConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentIntentId, bookingId, amount, customerName, customerEmail } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "PaymentIntent ID is required." },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment status is ${intent.status}, expected 'succeeded'.` },
        { status: 400 }
      );
    }

    const verifiedAmount = (intent.amount || 0) / 100;
    const finalBookingId = Number(bookingId || intent.metadata?.booking_id || 0);

    const admin = createAdminClient();

    // 1. Update or insert into Supabase payments table
    if (finalBookingId > 0) {
      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("booking_id", finalBookingId)
        .maybeSingle();

      if (existing) {
        await admin
          .from("payments")
          .update({
            status: "paid",
            payment_method: "card",
            amount: verifiedAmount,
            paid_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await admin.from("payments").insert({
          booking_id: finalBookingId,
          status: "paid",
          payment_method: "card",
          amount: verifiedAmount,
          paid_at: new Date().toISOString(),
        });
      }

      // 2. Update Bookings table
      await admin
        .from("Bookings")
        .update({
          status: "paid",
          approved_at: new Date().toISOString(),
          admin_remark: `Paid via Stripe Card (ID: ${paymentIntentId})`,
        })
        .eq("id", finalBookingId);

      // Fetch full booking details for voucher generation
      const { data: booking } = await admin
        .from("Bookings")
        .select(`
          *,
          tours (
            id,
            title_en,
            title_th,
            title_zh,
            partner_company,
            price,
            child_price
          )
        `)
        .eq("id", finalBookingId)
        .maybeSingle();

      const tourData = Array.isArray(booking?.tours)
        ? booking.tours[0]
        : booking?.tours;

      // 3. Record in payment receipts store as verified
      try {
        await savePaymentReceipt({
          booking_id: finalBookingId,
          amount: verifiedAmount,
          payment_method: "card",
          slip_url: `/stripe/receipt/${paymentIntentId}`,
          slip_filename: `stripe_${paymentIntentId}.json`,
          customer_name: customerName || booking?.customer_name || intent.metadata?.customer_name || "",
          customer_email: customerEmail || booking?.customer_email || intent.metadata?.customer_email || "",
          status: "verified",
          notes: `Stripe PaymentIntent ${paymentIntentId} verified online.`,
        });
      } catch (recErr) {
        console.warn("Could not record receipt:", recErr);
      }

      // 4. Send official Tour Voucher confirmation email
      const targetEmail =
        customerEmail ||
        booking?.customer_email ||
        intent.metadata?.customer_email;

      if (targetEmail) {
        try {
          const pickup = await getBookingPickup(finalBookingId);
          const voucherNo =
            booking?.booking_code?.replace(/^BK-/, "") ||
            `SHG-${String(finalBookingId).padStart(5, "0")}`;

          await sendVoucherConfirmationEmail({
            to: targetEmail,
            customerName:
              customerName || booking?.customer_name || "Valued Guest",
            bookingId: finalBookingId,
            bookingCode: booking?.booking_code,
            voucherNo,
            tourName: tourData?.title_en || "Silver Hawk Luxury Tour",
            partnerCompany:
              tourData?.partner_company || "Silver Hawk Group Co., Ltd.",
            travelDate: booking?.travel_date || "As confirmed",
            hotel: pickup?.hotelAddress || "Hotel Lobby (To be confirmed)",
            roomNo: pickup?.roomNumber || undefined,
            pickupTime: pickup?.meetingTime || "To be advised by concierge",
            guestCount: Number(booking?.guests || 1),
            adultCount: Number(booking?.guests || 1),
            childCount: 0,
            totalAmount: verifiedAmount,
            paymentMethod: "Credit / Debit Card (Stripe)",
            remark:
              pickup?.pickupNotes ||
              "Please present this voucher or your digital confirmation on your phone upon pickup.",
          });
        } catch (mailErr) {
          console.warn("Could not send voucher confirmation email for Stripe payment:", mailErr);
        }
      }

      // 5. Audit Log
      try {
        await addAuditLog({
          action: "STRIPE_PAYMENT_SUCCESS",
          adminEmail: "system@stripe.com",
          targetType: "payment",
          targetId: finalBookingId,
          description: `Stripe online card payment verified for Booking #${finalBookingId} (฿${verifiedAmount.toLocaleString()}) - Intent: ${paymentIntentId}`,
        });
      } catch (logErr) {
        console.warn("Audit log error:", logErr);
      }

      // 6. Revalidate cached routes
      try {
        revalidatePath("/[locale]/admin/payments", "page");
        revalidatePath("/[locale]/admin/bookings", "page");
        revalidatePath("/[locale]/Payment-Success", "page");
      } catch (revErr) {
        console.warn("Revalidation warning:", revErr);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: finalBookingId,
      paymentIntentId,
      status: "paid",
      amount: verifiedAmount,
    });
  } catch (error: any) {
    console.error("Stripe confirm error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to confirm Stripe payment." },
      { status: 500 }
    );
  }
}
