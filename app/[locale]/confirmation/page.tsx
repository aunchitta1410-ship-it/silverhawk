import { getLocale, getTranslations } from "next-intl/server";
import { createHash } from "node:crypto";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import BookingStatus from "./BookingStatus";
import BookingProgressStepper from "@/app/components/BookingProgressStepper";
import { getBookingPickup } from "@/lib/booking-pickup";
import { getPaymentReceiptByBookingId } from "@/lib/payment-receipt";
import { AdultIcon, ChildIcon, InfantIcon } from "@/app/components/PassengerIcons";

type ConfirmationProps = {
  searchParams: Promise<{
    bookingId?: string;
    token?: string;
  }>;
};

export default async function Confirmation({
  searchParams,
}: ConfirmationProps) {
  const params = await searchParams;
  const t = await getTranslations("confirmation");
  const locale = await getLocale();

  const isThai = locale === "th";
  const isChinese = locale === "zh";

  const rawBookingId = params.bookingId?.trim();
  const accessToken = params.token?.trim();

  // If no bookingId provided, render Booking Lookup Tracker Form
  if (!rawBookingId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4EFE2] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 text-center shadow-md border border-[#E6E0D5]">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17352A] text-[#D1B16A] shadow-xs">
              <span className="text-2xl">🔍</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#1C2119]">
            {isChinese ? "查询您的预订状态" : isThai ? "ตรวจสอบสถานะการจองทัวร์" : "Track Your Booking Status"}
          </h1>
          <p className="mt-2 text-xs text-gray-500">
            {isChinese
              ? "输入您的预订编号或确认流水号（例如 #1216 或 BK-1216）即可实时跟踪审核进度与下载凭证。"
              : isThai
              ? "กรอกรหัสการจองของคุณ (เช่น #1216 หรือ BK-1216) เพื่อตรวจสอบความคืบหน้าการอนุมัติและรับเวาเชอร์"
              : "Enter your Booking ID or Booking Code (e.g. #1216 or BK-1216) to check review progress and access your voucher."}
          </p>

          <form action={`/${locale}/confirmation`} method="GET" className="mt-6 space-y-3">
            <input
              type="text"
              name="bookingId"
              placeholder="e.g. 1216 or BK-1216"
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-center font-mono font-bold text-[#17352A] focus:border-[#B89450] focus:outline-none shadow-2xs"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] py-3 text-xs font-bold text-[#282722] shadow-sm hover:brightness-105 transition"
            >
              {isChinese ? "立即查询预订" : isThai ? "ค้นหาการจอง" : "Track Status Now"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <Link href={`/${locale}`} className="text-xs font-semibold text-gray-500 hover:text-[#17352A]">
              ← {isChinese ? "返回首页" : isThai ? "กลับหน้าแรก" : "Return to Home"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const cleanId = rawBookingId.replace(/^BK-/i, "").trim();
  const isNumeric = /^[1-9]\d*$/.test(cleanId) && Number.isSafeInteger(Number(cleanId));

  const supabase = createAdminClient();

  let query = supabase
    .from("Bookings")
    .select(`
      id,
      booking_code,
      customer_name,
      customer_email,
      guests,
      travel_date,
      status,
      tour_id,
      admin_remark,
      access_token_hash,
      created_at
    `);

  if (isNumeric) {
    query = query.or(`id.eq.${Number(cleanId)},booking_code.eq.${rawBookingId}`);
  } else {
    query = query.eq("booking_code", rawBookingId);
  }

  if (accessToken && /^[a-f0-9]{64}$/i.test(accessToken)) {
    const accessTokenHash = createHash("sha256")
      .update(accessToken)
      .digest("hex");
    query = query.eq("access_token_hash", accessTokenHash);
  }

  const { data: booking, error } = await query.maybeSingle();

  if (error || !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4EFE2] p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 text-center shadow-md border border-[#E6E0D5]">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-[#1C2119]">
            {isChinese ? "未找到此预订" : isThai ? "ไม่พบข้อมูลการจอง" : t("notFound") || "Booking Not Found"}
          </h1>
          <p className="mt-2 text-xs text-gray-600">
            {isChinese
              ? `未查询到编号 "${rawBookingId}" 的预订记录。请核对编号后重试。`
              : isThai
              ? `ไม่พบข้อมูลการจองหมายเลข "${rawBookingId}" กรุณาตรวจสอบรหัสอีกครั้ง`
              : `No booking record was found matching Booking ID "${rawBookingId}".`}
          </p>

          <form action={`/${locale}/confirmation`} method="GET" className="mt-6 space-y-3">
            <input
              type="text"
              name="bookingId"
              defaultValue={rawBookingId}
              placeholder="e.g. 1216 or BK-1216"
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs text-center font-mono font-bold text-[#17352A] focus:border-[#B89450] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-[#17352A] py-2.5 text-xs font-bold text-[#D1B16A] hover:bg-[#122b22] transition"
            >
              {isChinese ? "重新查询" : isThai ? "ค้นหาอีกครั้ง" : "Search Again"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <Link href={`/${locale}`} className="text-xs font-semibold text-gray-500 hover:text-[#17352A]">
              ← {isChinese ? "返回首页" : isThai ? "กลับหน้าแรก" : "Return to Home"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: tour } = await supabase
    .from("tours")
    .select("title_en, title_zh, title_th")
    .eq("id", booking.tour_id)
    .maybeSingle();

  const { data: guestList } = await supabase
    .from("booking_guests")
    .select("guest_number, title, first_name, last_name, guest_type, dietary_requirements, allergies, other_requests")
    .eq("booking_id", booking.id)
    .order("guest_number", { ascending: true });

  const adultCount = guestList?.filter((g) => g.guest_type === "Adult").length ?? 0;
  const childCount = guestList?.filter((g) => g.guest_type === "Child").length ?? 0;
  const infantCount = guestList?.filter((g) => g.guest_type === "Infant").length ?? 0;

  const breakdownParts = [];
  if (adultCount > 0) breakdownParts.push({ icon: AdultIcon, count: adultCount, key: "adult" });
  if (childCount > 0) breakdownParts.push({ icon: ChildIcon, count: childCount, key: "child" });
  if (infantCount > 0) breakdownParts.push({ icon: InfantIcon, count: infantCount, key: "infant" });

  const guestsDisplay =
    breakdownParts.length > 0 ? (
      <span className="inline-flex items-center gap-1.5 flex-wrap justify-end">
        <span>{booking.guests}</span>
        <span className="text-gray-400 font-normal text-xs">(</span>
        {breakdownParts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <span key={item.key} className="inline-flex items-center gap-1 text-xs">
              {idx > 0 && <span className="text-gray-300 mr-0.5">•</span>}
              <Icon className="w-3.5 h-3.5 text-[#B89450]" />
              <span className="font-semibold text-gray-700">{item.count}</span>
            </span>
          );
        })}
        <span className="text-gray-400 font-normal text-xs">)</span>
      </span>
    ) : (
      String(booking.guests)
    );

  const pickup =
    (await getBookingPickup(booking.id)) ||
    (booking.booking_code ? await getBookingPickup(booking.booking_code) : null);

  const paymentReceipt = await getPaymentReceiptByBookingId(booking.id);

  const status = String(booking.status || "pending").toLowerCase();
  const isRejected = status === "rejected";
  const isCancelled = status === "cancelled";
  const isDeclined = isRejected || isCancelled;
  const isApproved = status === "approved";
  const isPaid = status === "paid" || status === "confirmed";
  const isUnderReview = status === "pending_verification" || status === "pending_review";

  const tourName =
    isThai
      ? tour?.title_th || tour?.title_en || "รายการท่องเที่ยว"
      : isChinese
      ? tour?.title_zh || tour?.title_en || "旅游行程"
      : tour?.title_en || "Tour Package";

  const displayBookingId =
    booking.booking_code || `BK-${booking.id}`;

  const statusLabel =
    isUnderReview
      ? isChinese ? "付款凭证审核中" : isThai ? "กำลังตรวจสอบสลิป" : "Payment Under Review"
      : status === "pending"
      ? isChinese ? "等待审核" : isThai ? "รอการตรวจสอบ" : "Pending Review"
      : isApproved
      ? isChinese ? "预订已获批准" : isThai ? "อนุมัติแล้ว (รอชำระเงิน)" : "Approved (Payment Required)"
      : isPaid
      ? isChinese ? "预订已确认" : isThai ? "ชำระเงินแล้ว ยืนยันการจอง" : "Confirmed & Paid"
      : isRejected
      ? isChinese ? "已拒绝" : isThai ? "ปฏิเสธ" : "Rejected"
      : isCancelled
      ? isChinese ? "已取消" : isThai ? "ยกเลิกแล้ว" : "Cancelled"
      : status;

  const statusClass =
    isUnderReview
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : status === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : isApproved
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : isPaid
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-red-200 bg-red-50 text-red-800";

  const submittedAt = booking.created_at
    ? new Intl.DateTimeFormat(
        locale === "zh"
          ? "zh-CN"
          : locale === "th"
            ? "th-TH"
            : "en-GB",
        {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Bangkok",
        }
      ).format(new Date(booking.created_at))
    : null;

  return (
    <main className="min-h-screen bg-[#F4EFE2] px-3 py-6 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-xl mb-4">
        <BookingProgressStepper currentStep={isPaid ? 4 : isApproved ? 3 : 2} locale={locale} />
      </div>

      <div
        className={`mx-auto w-full max-w-xl rounded-2xl border bg-white p-4 shadow-sm sm:p-6 ${
          isDeclined ? "border-red-200" : isPaid ? "border-emerald-300" : isUnderReview ? "border-amber-300" : "border-[#E6E0D5]"
        }`}
      >
        <BookingStatus
          bookingId={displayBookingId}
          accessToken={accessToken}
          initialStatus={booking.status}
          locale={locale}
        >
          {/* Header Card */}
          <section
            className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-4 ${
              isDeclined
                ? "border-red-200 bg-red-50"
                : isPaid
                ? "border-emerald-200 bg-emerald-50/50"
                : isUnderReview
                ? "border-amber-200 bg-amber-50/50"
                : "border-[#E6E0D5] bg-[#F8F6F0]"
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">
                Booking ID
              </p>
              <p className="mt-1 break-all text-xl font-bold text-[#1C2119]">
                {displayBookingId}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {statusLabel}
            </span>
          </section>

          {/* 1. Payment Under Review Banner (NO VOUCHER UNTIL APPROVED) */}
          {isUnderReview && (
            <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base animate-pulse">⏳</span>
                <p className="font-bold text-amber-900 text-sm">
                  {isChinese ? "付款凭证正在审核中" : isThai ? "สลิปการโอนเงินอยู่ระหว่างการตรวจสอบ" : "Payment Slip Under Admin Review"}
                </p>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                {isChinese
                  ? "我们已收到您提交的转账凭据。管理团队正在审核付款流水，审核通过后系统将立即发放官方行程凭证（Tour Voucher）。"
                  : isThai
                  ? "ระบบได้รับหลักฐานการโอนเงินของท่านแล้ว ฝ่ายปฏิบัติการกำลังตรวจสอบความถูกต้อง เมื่อตรวจสอบเสร็จสิ้น เวาเชอร์จะถูกปลดล็อกโดยอัตโนมัติ"
                  : "We have received your payment slip. Our operations team is verifying the transaction receipt. Once approved, your official tour voucher will unlock here immediately."}
              </p>
              {paymentReceipt?.slip_url && (
                <div className="pt-2 flex items-center gap-2 text-[10px] text-amber-700">
                  <span>📄 Slip uploaded at:</span>
                  <span className="font-mono font-semibold">
                    {new Date(paymentReceipt.uploaded_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. Ready for Payment Banner */}
          {isApproved && (
            <div className="mb-5 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-center shadow-xs">
              <p className="font-bold text-blue-900 text-sm flex items-center justify-center gap-1.5">
                <span>✓</span> {isChinese ? "预订已获批准！请完成付款" : isThai ? "การจองได้รับการอนุมัติแล้ว! กรุณาชำระเงิน" : "Booking Approved! Ready for Payment"}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {isChinese
                  ? "管理员已审核并通过您的出行申请。请前往付款页面完成支付以出票。"
                  : isThai
                  ? "ผู้ดูแลระบบอนุมัติคำขอจองแล้ว กรุณาดำเนินการชำระเงินเพื่อยืนยันสิทธิ์"
                  : "Your reservation request has been approved. Please proceed to payment to finalize your booking."}
              </p>
              <Link
                href={`/${locale}/Payment?bookingId=${displayBookingId}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#17352A] px-6 py-2.5 text-xs font-bold text-[#D1B16A] shadow-xs hover:bg-[#0e251c] transition"
              >
                <span>💳 {isChinese ? "立即前往付款" : isThai ? "ดำเนินการชำระเงิน" : "Proceed to Payment"} →</span>
              </Link>
            </div>
          )}

          {/* 3. Paid & Confirmed Banner (VOUCHER UNLOCKED) */}
          {isPaid && (
            <div className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center shadow-xs">
              <p className="font-bold text-emerald-900 text-base flex items-center justify-center gap-1.5">
                <span>🎫</span> {isChinese ? "付款已审核通过 — 行程凭证已生成" : isThai ? "การชำระเงินผ่านการตรวจสอบ — เวาเชอร์พร้อมใช้งาน" : "Payment Verified & Voucher Unlocked!"}
              </p>
              <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                {isChinese
                  ? "您的付款凭证已通过管理团队审核，预订正式生效。请点击下方查看或打印您的专属上船/登车凭证。"
                  : isThai
                  ? "หลักฐานการชำระเงินได้รับการตรวจสอบและยืนยันแล้ว ท่านสามารถเปิดดูหรือพิมพ์เวาเชอร์เพื่อใช้ในการเดินทางได้ทันที"
                  : "Your payment has been successfully verified and confirmed. You can now view, download, or print your official Tour Voucher."}
              </p>
              <Link
                href={`/${locale}/Payment-Success?bookingId=${displayBookingId}`}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#17352A] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#0e251c] transition"
              >
                <span>🖨️ {isChinese ? "查看与打印行程凭证" : isThai ? "ดูและพิมพ์เวาเชอร์ทัวร์" : "View & Print Tour Voucher"}</span>
              </Link>
            </div>
          )}

          {/* 4. Declined / Cancelled Banner */}
          {isDeclined && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
              <p className="font-bold text-red-800 text-sm flex items-center gap-1.5">
                <span>⚠️</span> {isChinese ? "预订已取消或未通过" : isThai ? "การจองถูกยกเลิกหรือไม่ผ่านการอนุมัติ" : "Tour Cancellation / Rejection Notice"}
              </p>
              <p className="mt-1 text-red-800 font-medium">
                {booking.admin_remark || "Operational or weather safety conditions."}
              </p>
              <p className="mt-2 text-[11px] text-red-600 leading-relaxed border-t border-red-200/60 pt-2">
                Under Silver Hawk cancellation policy, tours cancelled by operations due to weather or marine safety are <strong>100% fully refundable</strong>.
              </p>
            </div>
          )}

          {/* Booking Details Card */}
          <section
            className={`mb-5 rounded-xl border bg-white p-4 sm:p-5 ${
              isDeclined ? "border-red-200" : "border-[#E6E0D5]"
            }`}
          >
            <h2 className="mb-4 text-base font-bold text-[#1C2119]">
              {isChinese ? "预订详情信息" : isThai ? "รายละเอียดการจอง" : "Booking Details"}
            </h2>

            <div className="space-y-3 text-sm">
              <Detail
                label={isChinese ? "联系人姓名" : isThai ? "ชื่อผู้ติดต่อ" : "Customer Name"}
                value={booking.customer_name}
              />
              <Detail
                label={isChinese ? "联系邮箱" : isThai ? "อีเมล" : "Email"}
                value={booking.customer_email}
              />
              <Detail
                label={isChinese ? "预订项目" : isThai ? "รายการทัวร์" : "Tour"}
                value={tourName}
              />
              <Detail
                label={isChinese ? "出行人数" : isThai ? "จำนวนผู้เดินทาง" : "Guests"}
                value={guestsDisplay}
              />
              <Detail
                label={isChinese ? "出行日期" : isThai ? "วันเดินทาง" : "Travel Date"}
                value={booking.travel_date}
              />
              {pickup && (
                <>
                  <Detail
                    label={isChinese ? "接送方式" : isThai ? "บริการรับส่ง" : "Transfer Option"}
                    value={pickup.transferType || "Hotel pick-up"}
                  />
                  {pickup.pickupArea && (
                    <Detail
                      label={isChinese ? "接送区域" : isThai ? "โซนที่รับ" : "Pick-up Area"}
                      value={pickup.pickupArea}
                    />
                  )}
                  {pickup.meetingPoint && (
                    <Detail
                      label={isChinese ? "集合地点" : isThai ? "จุดนัดพบ" : "Meeting Point"}
                      value={pickup.meetingPoint}
                    />
                  )}
                  {pickup.meetingTime && (
                    <Detail
                      label={isChinese ? "集合时间" : isThai ? "เวลานัดหมาย" : "Meeting Time"}
                      value={pickup.meetingTime}
                    />
                  )}
                  {pickup.hotelAddress && (
                    <Detail
                      label={isChinese ? "酒店名称/地址" : isThai ? "โรงแรม/ที่อยู่" : "Hotel Address"}
                      value={pickup.hotelAddress}
                    />
                  )}
                  {pickup.roomNumber && (
                    <Detail
                      label={isChinese ? "房间号" : isThai ? "หมายเลขห้อง" : "Room Number"}
                      value={pickup.roomNumber}
                    />
                  )}
                  {pickup.customBookingData?.pricing_model === "cooking_class" && (
                    <Detail
                      label={isChinese ? "料理课程类型" : isThai ? "ประเภทคลาสเรียน" : "Cooking Class"}
                      value={`${pickup.customBookingData.cooking_mode === "join" ? "Join Class" : "Private Class"}${pickup.customBookingData.cooking_extra_dishes ? ` (+${pickup.customBookingData.cooking_extra_dishes} extra dishes)` : ""}`}
                    />
                  )}
                  {pickup.customBookingData?.atv_slot && (
                    <Detail
                      label={isChinese ? "ATV预订场次" : isThai ? "รอบเวลา ATV" : "ATV Session Slot"}
                      value={`${pickup.customBookingData.atv_slot} hrs (Drivers: ${pickup.customBookingData.atv_driver_count || 1})`}
                    />
                  )}
                  {pickup.customBookingData?.transfer_route && (
                    <Detail
                      label={isChinese ? "快艇路线" : isThai ? "เส้นทางสปีดโบ๊ท" : "Speedboat Route"}
                      value={pickup.customBookingData.transfer_route}
                    />
                  )}
                </>
              )}

              {/* Special Requests */}
              {guestList &&
                guestList.some(
                  (g) =>
                    (g.dietary_requirements?.length ?? 0) > 0 ||
                    (g.allergies?.length ?? 0) > 0 ||
                    Boolean(g.other_requests)
                ) && (
                  <Detail
                    label={isChinese ? "特殊需求申报" : isThai ? "ข้อกำหนดพิเศษ" : "Special Requests"}
                    value={
                      <div className="space-y-1 text-right text-xs">
                        {guestList.map((g, idx) => {
                          const reqs = [
                            g.dietary_requirements?.length
                              ? `Diet: ${g.dietary_requirements.join(", ")}`
                              : "",
                            g.allergies?.length
                              ? `Allergies: ${g.allergies.join(", ")}`
                              : "",
                            g.other_requests ? `Note: ${g.other_requests}` : "",
                          ].filter(Boolean);
                          if (!reqs.length) return null;
                          return (
                            <div
                              key={idx}
                              className="rounded bg-teal-50 border border-teal-100 p-1.5 text-teal-900"
                            >
                              <span className="font-semibold">Guest {idx + 1}: </span>
                              <span>{reqs.join(" | ")}</span>
                            </div>
                          );
                        })}
                      </div>
                    }
                  />
                )}

              {submittedAt && (
                <Detail
                  label={isChinese ? "订单提交时间" : isThai ? "เวลาที่ส่งคำขอ" : "Submitted At"}
                  value={submittedAt}
                />
              )}
            </div>
          </section>

          {/* Search Another Booking Footer */}
          <div className="text-center pt-2">
            <Link
              href={`/${locale}/confirmation`}
              className="text-xs font-semibold text-[#B89450] hover:underline"
            >
              🔍 {isChinese ? "查询其他预订编号" : isThai ? "ค้นหาการจองอื่น" : "Track a different booking"}
            </Link>
          </div>
        </BookingStatus>
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#EEEAE2] pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="break-words text-right font-medium text-[#1C2119]">
        {value ?? "—"}
      </span>
    </div>
  );
}
