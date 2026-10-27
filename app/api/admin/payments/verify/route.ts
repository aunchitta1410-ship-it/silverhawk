import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentReceipt, rejectPaymentReceipt } from "@/lib/payment-receipt";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";
import { getBookingPickup } from "@/lib/booking-pickup";
import {
  sendPaymentRejectionEmail,
  sendVoucherConfirmationEmail,
} from "@/lib/email";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const bookingId = body.bookingId || body.booking_id;
    const action = body.action;
    const rejectReason = body.rejectReason || body.reject_reason || body.admin_notes;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    const adminEmail = await getAdminEmail(user?.email);
    const admin = createAdminClient();

    // Fetch full booking details for reconciliation & emails
    let numericBookingId = /^\d+$/.test(String(bookingId)) ? Number(bookingId) : null;
    const selectTourQuery = `
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
    `;

    let booking: any = null;
    if (numericBookingId) {
      const { data } = await admin
        .from("Bookings")
        .select(selectTourQuery)
        .eq("id", numericBookingId)
        .maybeSingle();
      booking = data;
    }

    if (!booking) {
      const { data } = await admin
        .from("Bookings")
        .select(selectTourQuery)
        .eq("booking_code", String(bookingId))
        .maybeSingle();
      booking = data;
    }

    if (!booking && String(bookingId).startsWith("BK-")) {
      const alt = String(bookingId).replace(/^BK-/, "");
      if (/^\d+$/.test(alt)) {
        const { data } = await admin
          .from("Bookings")
          .select(selectTourQuery)
          .eq("id", Number(alt))
          .maybeSingle();
        booking = data;
      }
    }

    const finalBookingId = booking?.id || numericBookingId || bookingId;

    const tourData = Array.isArray(booking?.tours)
      ? booking.tours[0]
      : booking?.tours;

    // ========================================================
    // 1. REJECT PAYMENT RECEIPT FLOW
    // ========================================================
    if (action === "reject") {
      const finalRejectReason =
        rejectReason?.trim() ||
        "Payment slip details or amount could not be verified by finance.";

      const updated = await rejectPaymentReceipt(
        finalBookingId,
        finalRejectReason,
        adminEmail
      );

      await addAuditLog({
        action: "REJECT_PAYMENT_SLIP",
        adminEmail,
        targetType: "payment",
        targetId: Number(booking?.id || 0),
        description: `Rejected payment receipt for booking #${booking?.booking_code || finalBookingId}: ${finalRejectReason}`,
      });

      // Send rejection notification email with admin's input reason
      let emailSent = false;
      let emailError: string | null = null;

      if (booking?.customer_email) {
        try {
          await sendPaymentRejectionEmail({
            to: booking.customer_email,
            customerName: booking.customer_name || "Valued Customer",
            bookingId: booking.id,
            bookingCode: booking.booking_code || `BK-${booking.id}`,
            tourName: tourData?.title_en || "Silver Hawk Luxury Tour",
            travelDate: booking.travel_date || "As confirmed",
            amount: updated?.amount || 0,
            rejectReason: finalRejectReason,
            paymentMethod: updated?.payment_method || "bank_transfer",
          });
          emailSent = true;
        } catch (mailErr: any) {
          console.warn("Could not send payment rejection email:", mailErr);
          emailError = mailErr?.message || "Failed to send rejection email";
        }
      }

      try {
        revalidatePath("/[locale]/admin/payments", "page");
        revalidatePath("/[locale]/admin/bookings", "page");
        revalidatePath("/[locale]/Payment-Success", "page");
      } catch (revErr) {
        console.warn("Revalidation warning:", revErr);
      }

      return NextResponse.json({
        success: true,
        receipt: updated,
        emailSent,
        emailError,
        message: emailSent
          ? `Receipt rejected and notification email sent to ${booking?.customer_email}.`
          : "Receipt rejected.",
      });
    }

    // ========================================================
    // 2. APPROVE & VERIFY PAYMENT FLOW (EMAIL TOUR VOUCHER)
    // ========================================================
    const updated = await verifyPaymentReceipt(finalBookingId, adminEmail);

    await addAuditLog({
      action: "VERIFY_PAYMENT_SLIP",
      adminEmail,
      targetType: "payment",
      targetId: Number(booking?.id || 0),
      description: `Verified and approved payment receipt (${updated?.payment_method || "transfer"}) for booking #${booking?.booking_code || finalBookingId}`,
    });

    // Fetch guests & pickup details for the official voucher
    const { data: guests } = await admin
      .from("booking_guests")
      .select("guest_type")
      .eq("booking_id", Number(booking?.id || finalBookingId));

    const pickupDetails =
      (await getBookingPickup(Number(booking?.id || finalBookingId))) ||
      (booking?.booking_code ? await getBookingPickup(booking.booking_code) : null);

    const adults =
      (guests || []).filter((g) => g.guest_type === "Adult").length ||
      Number(booking?.guests || 1);
    const children =
      (guests || []).filter((g) => g.guest_type === "Child").length || 0;

    const voucherNo =
      booking?.booking_code ||
      String(booking?.id || bookingId);

    let voucherEmailSent = false;
    let voucherEmailError: string | null = null;

    if (booking?.customer_email) {
      try {
        await sendVoucherConfirmationEmail({
          to: booking.customer_email,
          customerName: booking.customer_name || "Valued Customer",
          bookingId: booking.id,
          bookingCode: booking.booking_code || `BK-${booking.id}`,
          voucherNo,
          tourName: tourData?.title_en || "Silver Hawk Luxury Tour",
          partnerCompany: tourData?.partner_company || "Nikorn Marine",
          travelDate: booking.travel_date || "As confirmed",
          pickupTime:
            pickupDetails?.meetingTime || "07:30 AM (Please check lobby notice)",
          hotel: pickupDetails?.hotelAddress || "Hotel Lobby (To be confirmed)",
          roomNo: pickupDetails?.roomNumber || "",
          guestCount: Number(booking.guests || 1),
          adultCount: adults,
          childCount: children,
          totalAmount: updated?.amount || 0,
          paymentMethod: updated?.payment_method || "bank_transfer",
          remark:
            pickupDetails?.pickupNotes ||
            "Please be ready in your hotel lobby 10 minutes prior to pickup time.",
        });
        voucherEmailSent = true;
      } catch (mailErr: any) {
        console.warn("Could not send voucher confirmation email:", mailErr);
        voucherEmailError = mailErr?.message || "Failed to send voucher email";
      }
    }

    try {
      revalidatePath("/[locale]/admin/payments", "page");
      revalidatePath("/[locale]/admin/bookings", "page");
      revalidatePath("/[locale]/Payment-Success", "page");
    } catch (revErr) {
      console.warn("Revalidation warning:", revErr);
    }

    return NextResponse.json({
      success: true,
      receipt: updated,
      emailSent: voucherEmailSent,
      emailError: voucherEmailError,
      message: voucherEmailSent
        ? `Payment approved and official voucher emailed to ${booking?.customer_email}.`
        : "Payment approved successfully.",
    });
  } catch (err: any) {
    console.error("Payment verification error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
