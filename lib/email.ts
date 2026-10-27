
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type BookingConfirmationEmail = {
  to: string;
  bookingId: string;
  tourName: string;
  travelDate: string;
  guestCount: number;
  accessToken: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

export async function sendBookingConfirmationEmail({
  to,
  bookingId,
  tourName,
  travelDate,
  guestCount,
  accessToken,
}: BookingConfirmationEmail) {
  const from = process.env.EMAIL_FROM;
  const statusUrl = process.env.BOOKING_STATUS_URL;

  if (!from || !statusUrl) {
    throw new Error(
      "EMAIL_FROM or BOOKING_STATUS_URL is not configured"
    );
  }

  let url: URL;
  try {
    url = new URL(statusUrl);
  } catch {
    url = new URL("https://silverhawk-tours.com/booking/confirmation");
  }

  url.searchParams.set("bookingId", bookingId);
  url.searchParams.set("token", accessToken);

  const safeBookingId = escapeHtml(bookingId);
  const safeTourName = escapeHtml(tourName);
  const safeTravelDate = escapeHtml(travelDate);
  const safeGuestCount = escapeHtml(String(guestCount));
  const safeUrl = escapeHtml(url.toString());

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: `Booking Received — ${bookingId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#252525;line-height:1.7">
        <h1 style="color:#B89450">Silver Hawk Group</h1>

        <h2>Booking Confirmation</h2>

        <p>Dear Customer,</p>

        <p>
          Thank you for choosing Silver Hawk Group.
          We have received your booking request.
        </p>

        <div style="background:#f7f5f0;padding:20px;border-radius:8px">
          <p><strong>Booking ID:</strong> ${safeBookingId}</p>
          <p><strong>Tour:</strong> ${safeTourName}</p>
          <p><strong>Travel Date:</strong> ${safeTravelDate}</p>
          <p><strong>Guests:</strong> ${safeGuestCount}</p>
          <p><strong>Status:</strong> Pending — Awaiting Admin Review</p>
        </div>

        <p>
          Your booking has not yet been approved.
          Please wait for our confirmation email before proceeding
          with payment.
        </p>

        <p style="margin:28px 0">
          <a href="${safeUrl}"
             style="background:#B89450;color:#fff;padding:12px 20px;
             text-decoration:none;border-radius:5px;display:inline-block">
            Check Booking Status
          </a>
        </p>

        <p>
          If you have any questions, please contact our team.
        </p>

        <p>Best regards,<br/>Silver Hawk Group</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email ID");
  }

  return { emailId: data.id };
}


type BookingDecisionEmail = {
  to: string;
  customerName: string;
  bookingId: string;
  tourName: string;
  travelDate: string;
  guestCount: number;
  status: "approved" | "cancelled" | "rejected";
  rejectReason?: string;
};

export async function sendBookingDecisionEmail({
  to,
  customerName,
  bookingId,
  tourName,
  travelDate,
  guestCount,
  status,
  rejectReason,
}: BookingDecisionEmail) {
  const from = process.env.EMAIL_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!from || !process.env.RESEND_API_KEY || !siteUrl) {
    throw new Error(
      "EMAIL_FROM, RESEND_API_KEY or NEXT_PUBLIC_SITE_URL is not configured"
    );
  }

  let safeSiteUrl = "https://silverhawk-tours.com";
  try {
    if (siteUrl) {
      const parsed = new URL(siteUrl);
      safeSiteUrl = escapeHtml(parsed.toString());
    }
  } catch {
    safeSiteUrl = escapeHtml(siteUrl || "");
  }

  const safeCustomerName = escapeHtml(customerName);
  const safeBookingId = escapeHtml(bookingId);
  const safeTourName = escapeHtml(tourName);
  const safeTravelDate = escapeHtml(travelDate);
  const safeGuestCount = escapeHtml(String(guestCount));
  const safeRejectReason = escapeHtml(
    rejectReason?.trim() || "Operational or weather safety conditions."
  );

  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  const subject = isApproved
    ? `Booking Approved — ${bookingId} (Silver Hawk Tours)`
    : isRejected
    ? `Booking Request Declined — ${bookingId} (Silver Hawk Tours)`
    : `Tour Cancellation Notice — ${bookingId} (Silver Hawk Tours)`;

  const message = isApproved
    ? `
        <p>Good news! Your booking request has been approved by our operations team.</p>
        <p>
          Please review your booking and proceed to payment to finalize your tour and auto-generate your official Tour Voucher.
        </p>
      `
    : `
        <p>Dear ${safeCustomerName || "Valued Customer"},</p>
        <p>
          We regret to inform you that your tour booking for <strong>${safeTourName}</strong> scheduled on <strong>${safeTravelDate}</strong> has been ${isRejected ? "declined" : "cancelled"} by our operations team.
        </p>

        <div style="background:#FFF5F5;border-left:4px solid #E53E3E;padding:16px 20px;border-radius:6px;margin:20px 0">
          <p style="margin:0 0 6px 0;font-weight:bold;color:#C53030;font-size:14px">Official Reason for ${isRejected ? "Declining Request" : "Cancellation"}:</p>
          <p style="margin:0;font-size:15px;color:#2D3748;line-height:1.5">${safeRejectReason}</p>
        </div>

        <p><strong>Cancellation & Refund Policy:</strong></p>
        <p>
          Under Silver Hawk's Tour Cancellation Policy, when an excursion is cancelled or declined by the operator due to severe marine weather, safety advisories, or operational reasons, you are entitled to a <strong>100% full refund</strong> (if payment was already processed) or a free reschedule to another date.
        </p>
        <p>
          Our Phuket office team will assist you immediately with your refund or rebooking. If you have questions, please contact us at <strong>063-6064199</strong> or <strong>063-5959421</strong>, or reply directly to this email.
        </p>
      `;

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;
        max-width:600px;margin:auto;color:#252525;line-height:1.7">

        <h1 style="color:#B89450">Silver Hawk Group</h1>

        <h2>${isApproved ? "Booking Approved" : "Booking Update"}</h2>

        <p>Dear ${safeCustomerName || "Customer"},</p>

        <p><strong>Booking Details</strong></p>

        <div style="background:#f7f5f0;padding:20px;border-radius:8px">
          <p><strong>Booking ID:</strong> ${safeBookingId}</p>
          <p><strong>Tour:</strong> ${safeTourName}</p>
          <p><strong>Travel Date:</strong> ${safeTravelDate}</p>
          <p><strong>Guests:</strong> ${safeGuestCount}</p>
          <p><strong>Status:</strong> ${isApproved ? "Approved" : "Declined"}</p>
        </div>

        ${message}

        <p style="margin:28px 0">
          <a href="${safeSiteUrl}"
             style="background:#B89450;color:#111;padding:12px 20px;
             text-decoration:none;border-radius:5px;display:inline-block;
             font-weight:bold">
            Visit Silver Hawk Website
          </a>
        </p>

        <p>You may also reply directly to this email if you need assistance.</p>

        <p>Best regards,<br/>Silver Hawk Group</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend did not return an email ID");
  }

  return { emailId: data.id };
}

export type PaymentRejectionEmailOptions = {
  to: string;
  customerName: string;
  bookingId: string | number;
  bookingCode?: string;
  tourName: string;
  travelDate: string;
  amount: number;
  rejectReason: string;
  paymentMethod?: string;
  paymentUrl?: string;
};

export async function sendPaymentRejectionEmail({
  to,
  customerName,
  bookingId,
  bookingCode,
  tourName,
  travelDate,
  amount,
  rejectReason,
  paymentMethod,
  paymentUrl,
}: PaymentRejectionEmailOptions) {
  const from = process.env.EMAIL_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://silverhawk-tours.com";

  if (!from || !process.env.RESEND_API_KEY) {
    throw new Error("EMAIL_FROM or RESEND_API_KEY is not configured");
  }

  const safeCustomerName = escapeHtml(customerName || "Customer");
  const safeBookingId = escapeHtml(String(bookingId));
  const safeBookingCode = escapeHtml(bookingCode || `BK-${bookingId}`);
  const safeTourName = escapeHtml(tourName || "Silver Hawk Luxury Tour");
  const safeTravelDate = escapeHtml(travelDate || "As confirmed");
  const safeAmount = Number(amount || 0);
  const safePaymentMethod = escapeHtml(
    paymentMethod === "bank_transfer"
      ? "Direct Bank Transfer"
      : paymentMethod === "qr_payment"
      ? "PromptPay QR"
      : paymentMethod || "Bank Transfer"
  );
  const safeRejectReason = escapeHtml(
    rejectReason?.trim() || "Payment slip could not be verified by finance."
  );

  const fallbackUrl = `${siteUrl.replace(/\/$/, "")}/en/Payment?bookingId=${bookingId}`;
  const safePaymentUrl = escapeHtml(paymentUrl || fallbackUrl);

  const subject = `Action Required: Payment Receipt Issue — Booking #${safeBookingCode}`;

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:auto;color:#1F2937;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
        <div style="background:#17352A;padding:24px 32px;text-align:center">
          <h1 style="color:#D1B16A;margin:0;font-size:24px;letter-spacing:1px;font-weight:700">SILVER HAWK GROUP</h1>
          <p style="color:#FAF8F3;margin:4px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase">Payment Reconciliation Department</p>
        </div>

        <div style="padding:32px">
          <div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:16px 20px;border-radius:6px;margin-bottom:24px">
            <h2 style="color:#991B1B;margin:0 0 6px 0;font-size:16px;font-weight:700">Payment Receipt Requires Your Attention</h2>
            <p style="color:#7F1D1D;margin:0;font-size:14px;line-height:1.5">
              Our finance team has reviewed the payment receipt uploaded for Booking <strong>#${safeBookingCode}</strong> and was unable to verify the transaction.
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0">
            Dear <strong>${safeCustomerName}</strong>,
          </p>

          <p style="font-size:14px;line-height:1.6;color:#4B5563;margin:0 0 20px 0">
            Thank you for booking with Silver Hawk Group. During our receipt reconciliation check, our operations team encountered an issue with your submitted transfer slip.
          </p>

          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:18px 20px;margin-bottom:24px">
            <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.5px">
              Admin Verification Note / Reason for Rejection:
            </p>
            <p style="margin:0;font-size:15px;color:#78350F;font-weight:600;line-height:1.5">
              "${safeRejectReason}"
            </p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px">
            <tr style="border-bottom:1px solid #F3F4F6">
              <td style="padding:10px 0;color:#6B7280">Booking ID:</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827">#${safeBookingCode}</td>
            </tr>
            <tr style="border-bottom:1px solid #F3F4F6">
              <td style="padding:10px 0;color:#6B7280">Tour / Experience:</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827">${safeTourName}</td>
            </tr>
            <tr style="border-bottom:1px solid #F3F4F6">
              <td style="padding:10px 0;color:#6B7280">Travel Date:</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827">${safeTravelDate}</td>
            </tr>
            <tr style="border-bottom:1px solid #F3F4F6">
              <td style="padding:10px 0;color:#6B7280">Payment Method:</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827">${safePaymentMethod}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6B7280;font-size:14px;font-weight:700">Total Amount Due:</td>
              <td style="padding:10px 0;text-align:right;font-size:16px;font-weight:700;color:#B89450">฿${safeAmount.toLocaleString()}</td>
            </tr>
          </table>

          <h3 style="font-size:14px;font-weight:700;color:#111827;margin:0 0 10px 0">How to Resolve This:</h3>
          <ol style="margin:0 0 24px 0;padding-left:20px;font-size:13px;color:#4B5563;line-height:1.7">
            <li>Click the button below to visit your booking payment page.</li>
            <li>Upload a new, clear bank transfer receipt showing the transfer date, exact amount, and reference number.</li>
            <li>Or select <strong>Credit / Debit Card (Stripe)</strong> to complete your payment instantly online without waiting for manual verification.</li>
          </ol>

          <div style="text-align:center;margin:30px 0">
            <a href="${safePaymentUrl}" style="background:linear-gradient(to right, #D1B16A, #B89450);color:#1F2937;font-weight:700;font-size:14px;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
              Re-Upload Receipt or Pay Online →
            </a>
          </div>

          <p style="font-size:12px;color:#6B7280;line-height:1.5;margin:24px 0 0;border-top:1px solid #E5E7EB;padding-top:16px">
            Need assistance? Reply directly to this email or call our Phuket concierge desk at <strong>063-6064199</strong> or <strong>063-5959421</strong>.
          </p>
        </div>

        <div style="background:#F9FAFB;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF">
          Silver Hawk Group Co., Ltd. • 35/109 M.3, T.Vichit, A.Muang, Phuket 83000 Thailand
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  return { emailId: data?.id };
}

export type VoucherConfirmationEmailOptions = {
  to: string;
  customerName: string;
  bookingId: string | number;
  bookingCode?: string;
  voucherNo: string;
  tourName: string;
  partnerCompany?: string;
  travelDate: string;
  pickupTime?: string;
  hotel?: string;
  roomNo?: string;
  guestCount: number;
  adultCount: number;
  childCount?: number;
  totalAmount: number;
  paymentMethod: string;
  voucherUrl?: string;
  remark?: string;
};

export async function sendVoucherConfirmationEmail({
  to,
  customerName,
  bookingId,
  bookingCode,
  voucherNo,
  tourName,
  partnerCompany,
  travelDate,
  pickupTime,
  hotel,
  roomNo,
  guestCount,
  adultCount,
  childCount,
  totalAmount,
  paymentMethod,
  voucherUrl,
  remark,
}: VoucherConfirmationEmailOptions) {
  const from = process.env.EMAIL_FROM;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://silverhawk-tours.com";

  if (!from || !process.env.RESEND_API_KEY) {
    throw new Error("EMAIL_FROM or RESEND_API_KEY is not configured");
  }

  const safeCustomerName = escapeHtml(customerName || "Customer");
  const safeBookingId = escapeHtml(String(bookingId));
  const safeBookingCode = escapeHtml(bookingCode || `BK-${bookingId}`);
  const safeVoucherNo = escapeHtml(voucherNo || safeBookingCode);
  const safeTourName = escapeHtml(tourName || "Silver Hawk Luxury Tour");
  const safePartnerCompany = escapeHtml(partnerCompany || "Nikorn Marine");
  const safeTravelDate = escapeHtml(travelDate || "As scheduled");
  const safePickupTime = escapeHtml(pickupTime || "To be confirmed by concierge");
  const safeHotel = escapeHtml(hotel || "Hotel Lobby (To be confirmed)");
  const safeRoomNo = escapeHtml(roomNo || "");
  const safeAdultCount = adultCount || guestCount || 1;
  const safeChildCount = childCount || 0;
  const safeAmount = Number(totalAmount || 0);
  const safePaymentMethod = escapeHtml(
    paymentMethod === "card"
      ? "Credit / Debit Card (Stripe)"
      : paymentMethod === "bank_transfer"
      ? "Direct Bank Transfer"
      : paymentMethod === "qr_payment"
      ? "PromptPay QR"
      : paymentMethod || "Confirmed Payment"
  );
  const safeRemark = escapeHtml(
    remark || "Please be ready in the hotel lobby 10 minutes before pickup time. Non-refundable once tour commences."
  );

  const fallbackUrl = `${siteUrl.replace(/\/$/, "")}/en/Payment-Success?bookingId=${bookingId}&isUnderReview=false`;
  const safeVoucherUrl = escapeHtml(voucherUrl || fallbackUrl);

  const subject = `Booking Confirmed & Tour Voucher — #${safeVoucherNo} (Silver Hawk Group)`;

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;color:#1F2937;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
        <div style="background:#17352A;padding:26px 32px;text-align:center">
          <h1 style="color:#D1B16A;margin:0;font-size:24px;letter-spacing:1px;font-weight:700">SILVER HAWK GROUP</h1>
          <p style="color:#FAF8F3;margin:4px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase">Official Tour Voucher & Confirmation</p>
        </div>

        <div style="padding:32px">
          <div style="background:#ECFDF5;border-left:4px solid #10B981;padding:16px 20px;border-radius:6px;margin-bottom:24px">
            <h2 style="color:#065F46;margin:0 0 4px 0;font-size:16px;font-weight:700">✓ Payment Confirmed & Voucher Issued</h2>
            <p style="color:#047857;margin:0;font-size:13px;line-height:1.5">
              Your payment of <strong>฿${safeAmount.toLocaleString()}</strong> has been verified. Your tour is officially confirmed!
            </p>
          </div>

          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0">
            Dear <strong>${safeCustomerName}</strong>,
          </p>

          <p style="font-size:14px;line-height:1.6;color:#4B5563;margin:0 0 24px 0">
            Thank you for choosing Silver Hawk Group. Your payment reconciliation is complete, and your official tour voucher has been generated. Please find your voucher details below.
          </p>

          <!-- OFFICIAL VOUCHER BOX -->
          <div style="border:2px solid #CBD5E1;border-radius:10px;background:#F8FAFC;padding:22px;margin-bottom:26px">
            <div style="border-bottom:2px solid #94A3B8;padding-bottom:12px;margin-bottom:16px">
              <table style="width:100%">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:800;color:#1E40AF;display:block">Silver Hawk Group</span>
                    <span style="font-size:11px;color:#64748B">Operating Partner: ${safePartnerCompany}</span>
                  </td>
                  <td style="text-align:right">
                    <span style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;display:block">TOUR VOUCHER</span>
                    <span style="font-size:16px;font-weight:800;color:#0F172A;font-family:monospace">#${safeVoucherNo}</span>
                  </td>
                </tr>
              </table>
            </div>

            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B;width:40%">Guest Name:</td>
                <td style="padding:8px 0;font-weight:700;color:#0F172A">${safeCustomerName}</td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B">Tour / Service:</td>
                <td style="padding:8px 0;font-weight:700;color:#0F172A">${safeTourName}</td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B">Departure / Travel Date:</td>
                <td style="padding:8px 0;font-weight:700;color:#0F172A">${safeTravelDate}</td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B">Hotel & Room Number:</td>
                <td style="padding:8px 0;font-weight:600;color:#0F172A">${safeHotel} ${safeRoomNo ? `(Room ${safeRoomNo})` : ""}</td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B">Estimated Pick-up Time:</td>
                <td style="padding:8px 0;font-weight:700;color:#B89450">${safePickupTime}</td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B">Guests / Passengers:</td>
                <td style="padding:8px 0;font-weight:600;color:#0F172A">${safeAdultCount} Adult(s)${safeChildCount > 0 ? `, ${safeChildCount} Child(ren)` : ""}</td>
              </tr>
              <tr style="border-bottom:1px solid #E2E8F0">
                <td style="padding:8px 0;color:#64748B">Payment Method & Status:</td>
                <td style="padding:8px 0;font-weight:700;color:#059669">PAID (Verified via ${safePaymentMethod})</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0F172A">Total Paid:</td>
                <td style="padding:10px 0;font-size:17px;font-weight:800;color:#B89450">฿${safeAmount.toLocaleString()}</td>
              </tr>
            </table>

            <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #CBD5E1;font-size:11px;color:#64748B">
              <strong>Important:</strong> ${safeRemark}
            </div>
          </div>

          <div style="text-align:center;margin:28px 0">
            <a href="${safeVoucherUrl}" style="background:linear-gradient(to right, #D1B16A, #B89450);color:#1F2937;font-weight:700;font-size:14px;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
              View & Print Official Voucher Online →
            </a>
          </div>

          <div style="background:#F3F4F6;border-radius:8px;padding:16px 20px;font-size:12px;color:#4B5563;line-height:1.6">
            <p style="margin:0 0 6px 0;font-weight:700;color:#111827">Day of Tour Reminder:</p>
            <ul style="margin:0;padding-left:18px">
              <li>Please wait in your hotel lobby at least 10 minutes prior to your scheduled pickup time.</li>
              <li>Present this voucher or your digital confirmation on your mobile device to the chauffeur or pier guide.</li>
              <li>For real-time transport assistance on the day of travel, contact our transport team at <strong>063-6064199</strong>.</li>
            </ul>
          </div>
        </div>

        <div style="background:#F9FAFB;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF">
          Silver Hawk Group Co., Ltd. • Phuket, Thailand • Tel: 063-6064199, 063-5959421
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  return { emailId: data?.id };
}

