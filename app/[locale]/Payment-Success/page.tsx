import { getLocale, getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBookingPickup } from "@/lib/booking-pickup";
import { getPaymentReceiptByBookingId } from "@/lib/payment-receipt";
import TourVoucher, { type TourVoucherData } from "@/app/components/TourVoucher";

function formatDateDMY(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toLocaleDateString("en-GB");
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatDepartWithDay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[d.getDay()];
    return `${day}/${month}/${year} (${dayName})`;
  } catch {
    return dateStr;
  }
}

export default async function PaymentSuccess({
  searchParams,
}: {
  searchParams: Promise<{
    bookingId?: string;
    name?: string;
    email?: string;
    guests?: string;
    date?: string;
    tour?: string;
    price?: string;
    paymentMethod?: string;
    hotel?: string;
    roomNo?: string;
    isUnderReview?: string;
  }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("paymentSuccess");

  const bookingId = params.bookingId || "";
  let bookingData: any = null;
  let tourData: any = null;
  let paymentData: any = null;
  let guestRows: any[] = [];
  let pickupDetails: any = null;
  let uploadedReceipt: any = null;

  if (bookingId) {
    try {
      const supabase = createAdminClient();
      let b: any = null;

      if (/^\d+$/.test(bookingId)) {
        const { data } = await supabase
          .from("Bookings")
          .select("*")
          .eq("id", Number(bookingId))
          .maybeSingle();
        b = data;
      }

      if (!b) {
        const { data } = await supabase
          .from("Bookings")
          .select("*")
          .eq("booking_code", bookingId)
          .maybeSingle();
        b = data;
      }

      if (!b && bookingId.startsWith("BK-")) {
        const alt = bookingId.replace(/^BK-/, "");
        if (/^\d+$/.test(alt)) {
          const { data } = await supabase
            .from("Bookings")
            .select("*")
            .eq("id", Number(alt))
            .maybeSingle();
          b = data;
        }
      }

      bookingData = b;

      if (b) {
        const { data: tour } = await supabase
          .from("tours")
          .select("*")
          .eq("id", b.tour_id)
          .maybeSingle();
        tourData = tour;

        const { data: guests } = await supabase
          .from("booking_guests")
          .select("*")
          .eq("booking_id", b.id)
          .order("guest_number", { ascending: true });
        guestRows = guests || [];

        const { data: p } = await supabase
          .from("payments")
          .select("*")
          .eq("booking_id", b.id)
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentData = p;

        pickupDetails =
          (await getBookingPickup(b.id)) ||
          (b.booking_code ? await getBookingPickup(b.booking_code) : null);

        uploadedReceipt =
          (await getPaymentReceiptByBookingId(b.id)) ||
          (b.booking_code ? await getPaymentReceiptByBookingId(b.booking_code) : null);
      }
    } catch (e) {
      console.warn("Could not load full booking for voucher:", e);
    }
  }

  // Construct voucher information
  const customerName =
    bookingData?.customer_name || params.name || "Customer";
  const tourName =
    tourData?.title_en || bookingData?.tour_title || params.tour || "Silver Hawk Luxury Tour";
  const partnerCompany =
    tourData?.partner_company || "Nikorn Marine";

  const displayBookingId =
    bookingData?.booking_code ||
    (bookingData?.id ? `BK-${bookingData.id}` : "") ||
    (bookingId.startsWith("BK-") || !/^\d+$/.test(bookingId)
      ? bookingId
      : (bookingId ? `BK-${bookingId}` : ""));

  const voucherNo =
    bookingData?.booking_code?.replace(/^BK-/, "") ||
    bookingData?.booking_code ||
    (bookingData?.id ? `BK-${bookingData.id}` : "") ||
    displayBookingId.replace(/^BK-/, "") ||
    "1216";

  const travelDate = bookingData?.travel_date || params.date || "";
  const departDateStr = formatDepartWithDay(travelDate);
  const issueDateStr = formatDateDMY(paymentData?.paid_at || bookingData?.created_at);

  const adults =
    guestRows.filter((g) => g.guest_type === "Adult").length ||
    Number(params.guests) ||
    1;
  const children =
    guestRows.filter((g) => g.guest_type === "Child").length || 0;

  const adultPrice =
    Number(tourData?.price) || Math.round(Number(params.price || 3500) / (adults || 1));
  const childPrice =
    Number(tourData?.child_price) || (adultPrice > 0 ? Math.round(adultPrice * 0.75) : 0);

  const adultAmount = adults * adultPrice;
  const childAmount = children * childPrice;
  const subtotal = adultAmount + childAmount;

  // Payment method & fee
  const rawMethod = (
    paymentData?.payment_method ||
    params.paymentMethod ||
    "card"
  ).toLowerCase();

  const isCreditCard = rawMethod.includes("card") || rawMethod.includes("credit");
  const isCashPayment = rawMethod.includes("cash");
  const voucherMethod: "CASH" | "CREDIT" | "OTHER" = isCreditCard
    ? "CREDIT"
    : isCashPayment
    ? "CASH"
    : "OTHER";

  const feePercent = isCreditCard ? 4 : 0;
  const feeAmount = isCreditCard ? Math.round(subtotal * 0.04) : 0;
  const totalAmount =
    paymentData?.amount ||
    Number(params.price) ||
    subtotal + feeAmount;

  // Extract hotel and room number
  const hotelAddress =
    pickupDetails?.hotelAddress ||
    pickupDetails?.pickupNotes ||
    params.hotel ||
    "Andaman Cannacia";
  const roomNumber =
    pickupDetails?.roomNumber ||
    params.roomNo ||
    (hotelAddress.match(/room\s*[:#]?\s*([A-Za-z0-9\-]+)/i)?.[1] ?? "217");

  const pickupTime =
    pickupDetails?.meetingTime || "07.30 a.m.";

  // Remarks: combine special requirements or notes
  const remarksList: string[] = [];
  if (pickupDetails?.pickupNotes) remarksList.push(pickupDetails.pickupNotes);
  guestRows.forEach((g) => {
    if (g.dietary_requirements?.length) {
      remarksList.push(`Diet: ${g.dietary_requirements.join(", ")}`);
    }
    if (g.allergies?.length) {
      remarksList.push(`Allergies: ${g.allergies.join(", ")}`);
    }
    if (g.other_requests) {
      remarksList.push(g.other_requests);
    }
  });

  const voucherData: TourVoucherData = {
    voucherNo,
    issueDate: issueDateStr,
    tourService: tourName,
    company: "Silver Hawk Group", // Hidden partner company from customer-facing voucher
    guestName: customerName,
    hotel: hotelAddress.replace(/room\s*[:#]?\s*[A-Za-z0-9\-]+/i, "").trim() || hotelAddress,
    roomNo: roomNumber,
    pickupTime,
    departDate: departDateStr,
    adultCount: adults,
    adultPrice,
    adultAmount,
    childCount: children,
    childPrice: children > 0 ? childPrice : undefined,
    childAmount: children > 0 ? childAmount : undefined,
    paymentMethod: voucherMethod,
    feePercent: isCreditCard ? 4 : undefined,
    feeAmount: isCreditCard ? feeAmount : undefined,
    totalAmount,
    remark: remarksList.join(" | ") || "Non-refundable once tour commences.",
    issuedBy: "Pin",
  };

  // STRICT VOUCHER APPROVAL & REJECTION LOGIC:
  const isRejected =
    bookingData?.status === "rejected" ||
    paymentData?.status === "rejected" ||
    uploadedReceipt?.status === "rejected";

  const isApproved =
    !isRejected &&
    (bookingData?.status === "paid" ||
      bookingData?.status === "confirmed" ||
      (paymentData?.status === "paid" && params.isUnderReview !== "true"));

  const isUnderReview = !isRejected && !isApproved;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 print:min-h-0 print:p-0 print:m-0 print:bg-white">
      <div className="mx-auto max-w-4xl print:max-w-none print:m-0 print:p-0 print:w-full">
        {isRejected ? (
          /* ========================================================= */
          /* PAYMENT REJECTED STATE (DO NOT GO BACK TO UNDER REVIEW)   */
          /* ========================================================= */
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 sm:p-8 text-center shadow-sm border border-red-300">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700 shadow-xs">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3.5 py-1 text-xs font-bold text-red-800 mb-3">
                <span>⚠️</span>
                <span>Payment Slip Declined</span>
              </span>

              <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-[#17352A]">
                Payment Receipt Not Approved
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
                We were unable to approve your payment transfer slip for Booking <strong>#{displayBookingId}</strong>.
                Please review the reason below and submit a valid slip to confirm your reservation.
              </p>

              {/* Rejection Reason Card */}
              <div className="mt-6 max-w-lg mx-auto rounded-2xl border border-red-200 bg-red-50/70 p-4 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 block mb-1">
                  Reason for Rejection:
                </span>
                <p className="text-xs font-semibold text-red-950">
                  {uploadedReceipt?.reject_reason ||
                    bookingData?.admin_remark?.replace(/^Payment receipt rejected:\s*/i, "") ||
                    "Payment slip details or transferred amount could not be verified by finance."}
                </p>
                {uploadedReceipt?.verified_at && (
                  <p className="mt-2 text-[10px] text-red-700">
                    Reviewed on: {new Date(uploadedReceipt.verified_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`/${locale}/Payment?bookingId=${displayBookingId}`}
                  className="rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-6 py-2.5 text-xs font-bold text-[#282722] shadow-sm hover:brightness-105 transition"
                >
                  💳 Re-upload Payment Slip
                </a>
                <a
                  href={`/${locale}/confirmation?bookingId=${displayBookingId}`}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-2xs"
                >
                  Track Status
                </a>
              </div>
            </div>
          </div>
        ) : isUnderReview ? (
          /* ========================================================= */
          /* PENDING REVIEW / NO VOUCHER SHOWN UNTIL ADMIN APPROVAL    */
          /* ========================================================= */
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 sm:p-8 text-center shadow-sm border border-amber-300">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-xs">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800 mb-3">
                <span>⏳</span>
                <span>Payment Slip Under Review</span>
              </span>

              <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-[#17352A]">
                Payment Receipt Submitted!
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
                Thank you! We have received your payment transfer slip for Booking <strong>#{displayBookingId}</strong>.
                Our administration team is currently reviewing your transaction.
                <strong> The official Tour Voucher will be unlocked and emailed to you as soon as payment is approved.</strong>
              </p>

              {/* Status Stepper */}
              <div className="mt-8 max-w-2xl mx-auto rounded-2xl border border-gray-200 bg-[#FAF8F3] p-5 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17352A] mb-4">
                  Booking &amp; Verification Progress:
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
                    <div>
                      <span className="font-bold text-gray-900">Step 1: Booking Details Received</span>
                      <p className="text-[11px] text-gray-500">Guest details and pickup requests successfully captured.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">✓</span>
                    <div>
                      <span className="font-bold text-gray-900">Step 2: Payment Transfer Slip Uploaded</span>
                      <p className="text-[11px] text-gray-500">Transaction slip safely received in our verification queue.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold animate-pulse">⏳</span>
                    <div>
                      <span className="font-bold text-amber-900">Step 3: Admin Review &amp; Payment Verification (Current Step)</span>
                      <p className="text-[11px] text-amber-800 font-medium">Our operations team will verify the payment amount and release your booking approval.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-60">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-gray-700 text-xs font-bold">4</span>
                    <div>
                      <span className="font-semibold text-gray-700">Step 4: Booking Approved &amp; Official Tour Voucher Released</span>
                      <p className="text-[11px] text-gray-500">Voucher will be unlocked on your tracking page and sent via email.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="mt-6 max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Booking ID</span>
                  <span className="text-xs font-bold text-[#17352A]">{displayBookingId}</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Travel Date</span>
                  <span className="text-xs font-bold text-[#17352A]">{travelDate || "Confirmed"}</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Amount</span>
                  <span className="text-xs font-bold text-[#B89450]">฿{totalAmount.toLocaleString()}</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Payment Method</span>
                  <span className="text-xs font-bold text-[#17352A] capitalize">{rawMethod.replace(/_/g, " ")}</span>
                </div>
              </div>

              {/* Uploaded Slip Thumbnail Preview */}
              {uploadedReceipt?.slip_url && (
                <div className="mt-6 max-w-sm mx-auto rounded-2xl border border-gray-200 bg-[#FAF8F3] p-4 text-center">
                  <span className="text-[11px] font-bold text-gray-600 block mb-2">
                    📄 Submitted Payment Receipt
                  </span>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedReceipt.slip_url}
                      alt="Submitted Payment Slip"
                      className="max-h-48 w-full object-contain p-2"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`/${locale}`}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-2xs"
                >
                  Return to Home
                </a>
                <a
                  href={`/${locale}/confirmation?bookingId=${displayBookingId}`}
                  className="rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-6 py-2.5 text-xs font-bold text-[#282722] shadow-sm hover:brightness-105 transition"
                >
                  🔍 Track Booking Status
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* APPROVED / CONFIRMED BOOKING — UNLOCK AND SHOW VOUCHER    */
          /* ========================================================= */
          <div>
            <div className="mb-6 rounded-2xl bg-white p-6 text-center shadow-xs border border-green-200 print:hidden">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-[#17352A]">
                {t("title") || "Payment Verified & Booking Confirmed!"}
              </h1>

              <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto">
                {t("message") || "Your payment has been successfully reviewed and approved."}{" "}
                Your official Tour Voucher is now unlocked below. Please print or present this digital voucher upon boarding.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`/${locale}`}
                  className="inline-block rounded-xl border border-gray-300 bg-white px-5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {t("backHome") || "Return to Home"}
                </a>
                <a
                  href={`/${locale}/confirmation?bookingId=${displayBookingId}`}
                  className="inline-block rounded-xl border border-[#B89450]/40 bg-[#FAF8F3] px-5 py-2 text-xs font-semibold text-[#17352A] transition hover:border-[#B89450]"
                >
                  View Booking Status
                </a>
              </div>
            </div>

            {/* PRINTABLE TOUR VOUCHER COMPONENT (ONLY SHOWN WHEN APPROVED) */}
            <TourVoucher data={voucherData} showPrintButton={true} />
          </div>
        )}
      </div>
    </main>
  );
}
