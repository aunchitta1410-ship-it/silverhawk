"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import BookingProgressStepper from "@/app/components/BookingProgressStepper";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripeClientPromise } from "@/lib/stripe-client";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();

  const stripe = useStripe();
  const elements = useElements();
  const supabase = createClient();

  const [paymentMethod, setPaymentMethod] = useState("qr_payment");
  const [isPaying, setIsPaying] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipUploaded, setSlipUploaded] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [promptPayCopied, setPromptPayCopied] = useState(false);

  // Dynamic Payment Settings from Admin
  const [paymentSettings, setPaymentSettings] = useState({
    promptpay_enabled: true,
    promptpay_qr_image_url: "/images/promptpay-qr.svg",
    promptpay_id: "063-606-4199",
    promptpay_account_name: "Silver Hawk Group Co., Ltd.",
    promptpay_notes: "Scan QR with any Thai Mobile Banking app and upload your transfer slip.",
    bank_transfer_enabled: true,
    bank_name: "Kasikornbank (KBank)",
    bank_code: "KBANK",
    bank_branch: "Phuket Town Branch",
    account_name: "Silver Hawk Group Co., Ltd.",
    account_number: "045-8-91234-0",
    swift_code: "KASITHBK",
    bank_instructions: "Please transfer the exact booking amount to the account above and upload the transfer slip below for verification.",
  });

  useEffect(() => {
    async function loadPaymentSettings() {
      try {
        const res = await fetch("/api/payment-settings");
        const data = await res.json();
        if (data?.settings) {
          setPaymentSettings(data.settings);
        }
      } catch (e) {
        console.warn("Could not load dynamic payment settings:", e);
      }
    }
    loadPaymentSettings();
  }, []);

  // Stripe card form state
  const [cardholderName, setCardholderName] = useState(searchParams.get("name") || "");
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [testCardCopied, setTestCardCopied] = useState(false);

  // Booking information state
  const rawBookingParam = (
    searchParams.get("bookingId") || searchParams.get("booking_id") || ""
  ).trim();
  const initialDisplayCode =
    rawBookingParam.startsWith("BK-") || !/^\d+$/.test(rawBookingParam)
      ? rawBookingParam
      : rawBookingParam
      ? `BK-${rawBookingParam}`
      : "";
  const [resolvedBookingId, setResolvedBookingId] = useState<number | null>(
    /^\d+$/.test(rawBookingParam) ? Number(rawBookingParam) : null
  );
  const [displayBookingCode, setDisplayBookingCode] = useState<string>(initialDisplayCode);

  const [name, setName] = useState(searchParams.get("name") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [guests, setGuests] = useState(searchParams.get("guests") || "1");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [tour, setTour] = useState(searchParams.get("tour") || "Phuket Paradise");
  const [price, setPrice] = useState(searchParams.get("price") || "3500");
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingAdminRemark, setBookingAdminRemark] = useState<string | null>(null);

  useEffect(() => {
    if (!rawBookingParam) return;

    async function fetchBookingDetails() {
      let b: any = null;

      // 1. If numeric, query by id
      if (/^\d+$/.test(rawBookingParam)) {
        const { data } = await supabase
          .from("Bookings")
          .select("id, booking_code, customer_name, customer_email, tour_id, travel_date, guests, total_price, status, admin_remark")
          .eq("id", Number(rawBookingParam))
          .maybeSingle();
        b = data;
      }

      // 2. If not found or alphanumeric, query by booking_code
      if (!b) {
        const { data } = await supabase
          .from("Bookings")
          .select("id, booking_code, customer_name, customer_email, tour_id, travel_date, guests, total_price, status, admin_remark")
          .eq("booking_code", rawBookingParam)
          .maybeSingle();
        b = data;
      }

      // 3. Fallback: try stripping BK- prefix if present
      if (!b && rawBookingParam.startsWith("BK-")) {
        const alt = rawBookingParam.replace(/^BK-/, "");
        if (/^\d+$/.test(alt)) {
          const { data } = await supabase
            .from("Bookings")
            .select("id, booking_code, customer_name, customer_email, tour_id, travel_date, guests, total_price, status, admin_remark")
            .eq("id", Number(alt))
            .maybeSingle();
          b = data;
        }
      }

      if (b) {
        setResolvedBookingId(b.id);
        const code = b.booking_code || `BK-${b.id}`;
        setDisplayBookingCode(code);
        if (b.status) setBookingStatus(b.status);
        if (b.admin_remark) setBookingAdminRemark(b.admin_remark);
        if (b.customer_name) {
          setName(b.customer_name);
          setCardholderName((prev) => prev || b.customer_name);
        }
        if (b.customer_email) setEmail(b.customer_email);
        if (b.travel_date) setDate(b.travel_date);
        if (b.guests) setGuests(String(b.guests));
        if (b.total_price && !searchParams.get("price")) {
          setPrice(String(b.total_price));
        }

        if (b.tour_id) {
          const { data: t } = await supabase
            .from("tours")
            .select("title_en, price")
            .eq("id", b.tour_id)
            .maybeSingle();
          if (t?.title_en) setTour(t.title_en);
          if (t?.price && !searchParams.get("price") && !b.total_price) {
            setPrice(String(Number(t.price) * (b.guests || 1)));
          }
        }
      }
    }

    fetchBookingDetails();
  }, [rawBookingParam]);

  const isChinese = locale === "zh";
  const isThai = locale === "th";

  const baseAmount = Number(price) || 0;
  // 4% fee for credit card payment as per specification
  const cardFee = paymentMethod === "card" ? Math.round(baseAmount * 0.04) : 0;
  const finalAmount = baseAmount + cardFee;

  const handleCopyAccount = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(paymentSettings.account_number || "045-8-91234-0");
      setAccountCopied(true);
      setTimeout(() => setAccountCopied(false), 2500);
    }
  };

  const handleCopyPromptPay = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(paymentSettings.promptpay_id || "063-606-4199");
      setPromptPayCopied(true);
      setTimeout(() => setPromptPayCopied(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    setSlipUploaded(true);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawUrl = event.target?.result as string;
        if (typeof window === "undefined") {
          setSlipPreview(rawUrl);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setSlipPreview(dataUrl);
            return;
          }
          setSlipPreview(rawUrl);
        };
        img.onerror = () => setSlipPreview(rawUrl);
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSlipPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePayment = async () => {
    const finalDbBookingId = resolvedBookingId || (Number.isSafeInteger(Number(rawBookingParam)) ? Number(rawBookingParam) : 0);
    const finalDisplayCode =
      displayBookingCode ||
      (rawBookingParam.startsWith("BK-") || !/^\d+$/.test(rawBookingParam)
        ? rawBookingParam
        : (finalDbBookingId ? `BK-${finalDbBookingId}` : `BK-${rawBookingParam}`));

    if (!finalDbBookingId && !finalDisplayCode) {
      alert(isChinese ? "找不到预订编号" : "Booking ID not found");
      return;
    }

    // ==========================================
    // 1. STRIPE CREDIT & DEBIT CARD PAYMENT
    // ==========================================
    if (paymentMethod === "card") {
      if (!stripe || !elements) {
        alert(
          isChinese
            ? "Stripe 支付网关正在加载中，请稍候再试"
            : isThai
            ? "ระบบชำระเงิน Stripe กำลังโหลด กรุณารอสักครู่"
            : "Stripe payment gateway is still loading. Please try again in a moment."
        );
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        alert("Stripe card element could not be found.");
        return;
      }

      setIsPaying(true);
      setStripeError(null);

      try {
        // Step A: Create PaymentIntent on server
        const intentRes = await fetch("/api/payments/stripe/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: finalDbBookingId,
            amount: finalAmount,
            customerName: cardholderName.trim() || name.trim() || "Customer",
            customerEmail: email.trim(),
          }),
        });

        const intentJson = await intentRes.json();
        if (!intentRes.ok || !intentJson.clientSecret) {
          throw new Error(intentJson.error || "Failed to initialize Stripe payment.");
        }

        // Step B: Confirm card payment with Stripe (handles 3D Secure / OTP automatically)
        const confirmResult = await stripe.confirmCardPayment(
          intentJson.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: cardholderName.trim() || name.trim() || "Customer",
                email: email.trim() || undefined,
              },
            },
          }
        );

        if (confirmResult.error) {
          throw new Error(confirmResult.error.message || "Card payment was declined.");
        }

        if (
          confirmResult.paymentIntent &&
          confirmResult.paymentIntent.status === "succeeded"
        ) {
          // Step C: Confirm payment with backend to record in Supabase
          await fetch("/api/payments/stripe/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentIntentId: confirmResult.paymentIntent.id,
              bookingId: finalDbBookingId,
              amount: finalAmount,
              customerName: cardholderName.trim() || name.trim(),
              customerEmail: email.trim(),
            }),
          });

          // Step D: Redirect to Payment Success with Instant Voucher Unlocked!
          const params = new URLSearchParams();
          params.set("bookingId", String(finalDisplayCode));
          params.set("name", name);
          params.set("email", email);
          params.set("guests", guests);
          params.set("date", date);
          params.set("tour", tour);
          params.set("price", String(finalAmount));
          params.set("paymentMethod", "STRIPE_CARD");
          params.set("isUnderReview", "false"); // Voucher immediately approved!

          router.push(`/${locale}/Payment-Success?${params.toString()}`);
          return;
        } else {
          throw new Error(
            `Unexpected payment outcome: ${confirmResult.paymentIntent?.status}`
          );
        }
      } catch (err: any) {
        console.error("Stripe card payment error:", err);
        setStripeError(err?.message || "Failed to process card payment.");
        setIsPaying(false);
        return;
      }
    }

    // ==========================================
    // 2. PROMPTPAY QR & DIRECT BANK TRANSFER
    // ==========================================
    if ((paymentMethod === "qr_payment" || paymentMethod === "bank_transfer") && !slipUploaded && !slipPreview) {
      alert(
        isThai
          ? "กรุณาอัปโหลดสลิปหรือหลักฐานการโอนเงินเพื่อดำเนินการต่อ"
          : isChinese
          ? "请在提交前上传您的付款收据 / 转账凭证"
          : "Please upload your payment transfer slip / receipt before proceeding."
      );
      return;
    }

    setIsPaying(true);

    const paymentStatus = "pending";
    const bookingStatus = "pending";

    // 1. Save payment record
    if (finalDbBookingId > 0) {
      const { error } = await supabase.from("payments").insert({
        booking_id: finalDbBookingId,
        status: paymentStatus,
        payment_method: paymentMethod,
        amount: finalAmount,
        paid_at: null,
      });

      if (error) {
        console.warn("payment insert note:", error.message);
      }
    }

    // 2. Save payment receipt for QR and Bank Transfer
    if (paymentMethod === "qr_payment" || paymentMethod === "bank_transfer") {
      try {
        await fetch("/api/payments/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: finalDbBookingId || finalDisplayCode,
            amount: finalAmount,
            paymentMethod,
            slipUrl: slipPreview || "/images/sample-slip.png",
            slipFilename:
              slipFile?.name ||
              (paymentMethod === "bank_transfer"
                ? "bank_transfer_slip.jpg"
                : "promptpay_slip.jpg"),
            customerName: name,
            customerEmail: email,
          }),
        });
      } catch (err) {
        console.error("Failed to upload slip receipt:", err);
      }
    }

    // 3. Update booking status
    if (finalDbBookingId > 0) {
      await supabase
        .from("Bookings")
        .update({
          status: bookingStatus,
          admin_remark:
            paymentMethod === "bank_transfer"
              ? "Direct Bank Transfer receipt uploaded. Awaiting admin review."
              : "PromptPay QR receipt uploaded. Awaiting admin review.",
        })
        .eq("id", finalDbBookingId);
    }

    // 4. Go to Payment Success with review note
    const params = new URLSearchParams();
    params.set("bookingId", String(finalDisplayCode));
    params.set("name", name);
    params.set("email", email);
    params.set("guests", guests);
    params.set("date", date);
    params.set("tour", tour);
    params.set("price", String(finalAmount));
    params.set(
      "paymentMethod",
      paymentMethod === "qr_payment" ? "PROMPTPAY_QR" : "BANK_TRANSFER"
    );
    params.set("isUnderReview", "true");

    router.push(`/${locale}/Payment-Success?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">

        {/* Booking Stepper */}
        <BookingProgressStepper currentStep={4} locale={locale} />

        {/* Title */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#B89450]">
            SILVER HAWK GROUP
          </p>

          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {isChinese ? "付款" : isThai ? "ชำระเงิน" : "Payment"}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isChinese
              ? "请确认您的预订信息并完成付款"
              : isThai
              ? "โปรดตรวจสอบข้อมูลการจองและเลือกช่องทางชำระเงิน"
              : "Please review your booking and complete your payment"}
          </p>
        </div>

        {/* Booking ID */}
        <div className="mb-6 rounded-2xl bg-white border border-[#D6CEBD] p-4 text-center shadow-xs">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Booking ID
          </p>

          <p className="text-2xl font-bold text-[#282722] mt-0.5 font-mono">
            {displayBookingCode ||
              (rawBookingParam.startsWith("BK-") || !/^\d+$/.test(rawBookingParam)
                ? rawBookingParam
                : (resolvedBookingId ? `BK-${resolvedBookingId}` : `BK-${rawBookingParam}`))}
          </p>
        </div>

        {/* Previous Payment Rejected Alert */}
        {bookingStatus === "rejected" && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-950">
            <div className="flex items-center gap-2 font-bold text-red-900 text-sm mb-1">
              <span>⚠️</span>
              <span>Previous Payment Slip Not Approved</span>
            </div>
            <p className="text-red-800 leading-relaxed">
              {bookingAdminRemark?.replace(/^Payment receipt rejected:\s*/i, "") ||
                "Your previous payment slip or amount could not be verified by our finance team."}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-red-700">
              Please choose a payment method below and upload a valid, clear transfer slip to confirm your booking.
            </p>
          </div>
        )}

        {/* Booking Summary */}
        <div className="mb-6 rounded-2xl bg-white border border-[#D6CEBD] p-6 shadow-xs">
          <h2 className="mb-4 text-lg font-bold text-[#282722]">
            {isChinese ? "预订详情" : isThai ? "รายละเอียดการจอง" : "Booking Details"}
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">
                {isChinese ? "姓名" : "Name"}
              </span>
              <span className="text-right font-medium text-gray-900">
                {name}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">
                {isChinese ? "电子邮件" : "Email"}
              </span>
              <span className="text-right font-medium text-gray-900">
                {email}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">
                {isChinese ? "旅游项目" : "Tour"}
              </span>
              <span className="text-right font-medium text-gray-900">
                {tour}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">
                {isChinese ? "人数" : "Guests"}
              </span>
              <span className="font-medium text-gray-900">
                {guests}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                {isChinese ? "旅行日期" : "Travel Date"}
              </span>
              <span className="font-medium text-gray-900">
                {date}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6 rounded-2xl bg-white border border-[#D6CEBD] p-6 shadow-xs">
          <h2 className="mb-4 text-lg font-bold text-[#282722]">
            {isChinese ? "付款方式" : isThai ? "วิธีการชำระเงิน" : "Payment Method"}
          </h2>

          <div className="space-y-3">
            {/* Option 1: PromptPay QR Payment */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                paymentMethod === "qr_payment"
                  ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="qr_payment"
                  checked={paymentMethod === "qr_payment"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-[#B89450]"
                />
                <div>
                  <span className="font-semibold text-sm text-gray-900 block">
                    {isChinese ? "PromptPay 泰国即时二维码支付" : isThai ? "ไทยคิวอาร์ / พร้อมเพย์ (PromptPay QR)" : "Thai QR / PromptPay"}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Scan QR with mobile banking app & upload receipt
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                No extra fee
              </span>
            </label>

            {paymentMethod === "qr_payment" && (
              <div className="mt-3 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                <div className="grid gap-6 md:grid-cols-[240px_1fr] items-start">
                  {/* QR Box */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#B89450]/40 bg-[#FAF8F3] p-4 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentSettings.promptpay_qr_image_url || "/images/promptpay-qr.svg"}
                      alt="PromptPay QR Code"
                      className="h-56 w-56 rounded-xl object-contain shadow-xs bg-white p-2"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/promptpay-qr.svg";
                      }}
                    />
                    <p className="mt-2 text-xs font-bold text-[#17352A]">
                      {paymentSettings.promptpay_account_name || "Silver Hawk Group Co., Ltd."}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] font-mono text-gray-500">
                        PromptPay: {paymentSettings.promptpay_id || "063-606-4199"}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyPromptPay}
                        className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 border border-gray-200 hover:bg-[#B89450] hover:text-white transition"
                      >
                        {promptPayCopied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="mt-2 rounded-full bg-[#17352A] px-3 py-1 text-xs font-bold font-mono text-[#D1B16A]">
                      ฿{finalAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* Flow Instructions & Slip Upload */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {isChinese ? "付款与上传凭证流程" : isThai ? "ขั้นตอนการชำระเงินและอัปโหลดสลิป" : "Payment & Receipt Upload Steps"}
                      </h3>
                      <ol className="mt-2 list-decimal list-inside space-y-1.5 text-xs text-gray-600">
                        <li>Open any Thai Mobile Banking app (KBank, SCB, Bangkok Bank, Krungthai, etc.).</li>
                        <li>Scan the PromptPay QR code and verify the amount: <strong className="text-gray-900">฿{finalAmount.toLocaleString()}</strong>.</li>
                        <li>Complete the transfer and save the transfer slip/receipt to your device.</li>
                        <li>Upload your payment slip below. Our operations team will verify the transaction and confirm your booking.</li>
                      </ol>
                    </div>

                    {/* Upload Receipt Container */}
                    <div className="rounded-xl border-2 border-dashed border-[#B89450]/60 bg-[#FAF8F3]/60 p-4">
                      <label className="block text-xs font-bold text-gray-800 mb-2">
                        Upload Payment Slip / Receipt <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="file"
                        id="slip-upload-input"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          htmlFor="slip-upload-input"
                          className="cursor-pointer rounded-lg bg-[#B89450] px-4 py-2 text-xs font-bold text-white hover:bg-[#A38240] transition shadow-xs"
                        >
                          {slipUploaded ? "Replace Slip" : "Choose File"}
                        </label>
                        <span className="text-xs text-gray-600 truncate max-w-xs">
                          {slipFile ? slipFile.name : "No file chosen yet (JPG, PNG, PDF)"}
                        </span>
                      </div>

                      {/* Slip Image Preview */}
                      {slipPreview && (
                        <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/70 p-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slipPreview}
                            alt="Uploaded Slip"
                            className="h-16 w-16 rounded-md object-cover border border-green-300"
                          />
                          <div className="text-xs">
                            <p className="font-bold text-green-800">
                              Receipt Ready to Submit
                            </p>
                            <p className="text-[11px] text-green-600">
                              Will be reviewed by admin for instant confirmation
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Option 2: Credit / Debit Card (Powered by Stripe) */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                paymentMethod === "card"
                  ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-[#B89450]"
                />
                <div>
                  <span className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                    {isChinese ? "信用卡 / 借记卡 (Stripe)" : "Credit / Debit Card (Stripe)"}
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Stripe
                    </span>
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Visa, Mastercard, JCB, American Express
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                +4% fee
              </span>
            </label>

            {paymentMethod === "card" && (
              <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Stripe Credit & Debit Processing</span>
                      <span className="text-[10px] text-gray-500">Official 256-bit SSL Encrypted Sandbox Gateway</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                      Sandbox Active
                    </span>
                  </div>
                </div>

                {/* Sandbox helper card */}
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Stripe Sandbox Test Card Available:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText("4242424242424242");
                          setTestCardCopied(true);
                          setTimeout(() => setTestCardCopied(false), 2000);
                        }
                      }}
                      className="rounded bg-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-300 transition"
                    >
                      {testCardCopied ? "✓ Copied" : "Copy Test Card"}
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-amber-800">
                    Card: 4242 4242 4242 4242 • Exp: Any future date (e.g. 12/28) • CVC: 123
                  </p>
                </div>

                {/* Cardholder Full Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Cardholder Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450]"
                  />
                </div>

                {/* Stripe CardElement */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Card Details (Number, Expiration, CVC, ZIP) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                      <span>Visa</span> • <span>Mastercard</span> • <span>JCB</span> • <span>Amex</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-300 bg-white p-3.5 shadow-2xs transition focus-within:border-[#B89450] focus-within:ring-1 focus-within:ring-[#B89450]">
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: "14px",
                            color: "#1f2937",
                            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
                            "::placeholder": {
                              color: "#9ca3af",
                            },
                          },
                          invalid: {
                            color: "#dc2626",
                          },
                        },
                      }}
                      onChange={(e) => {
                        setIsCardComplete(e.complete);
                        if (e.error) {
                          setStripeError(e.error.message);
                        } else {
                          setStripeError(null);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Real-time Stripe Error Display */}
                {stripeError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{stripeError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                  <span>3D Secure 2.0 / OTP verification supported</span>
                  <span className="font-mono text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-emerald-600 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    PCI-DSS Level 1 Compliant
                  </span>
                </div>
              </div>
            )}

            {/* Option 3: Direct Bank Transfer */}
            <label
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                paymentMethod === "bank_transfer"
                  ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-[#B89450]"
                />
                <span className="font-semibold text-sm text-gray-900">
                  {isChinese ? "银行柜台 / 网上银行转账" : isThai ? "โอนผ่านบัญชีธนาคาร (Bank Transfer)" : "Direct Bank Transfer"}
                </span>
              </div>
              <span className="text-xs text-gray-500">No extra fee</span>
            </label>

            {paymentMethod === "bank_transfer" && (
              <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                {/* Bank Account Details Card */}
                <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00A950] font-bold text-white text-xs">
                        {paymentSettings.bank_code ? paymentSettings.bank_code.slice(0, 3) : "K+"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{paymentSettings.bank_name || "Kasikornbank (KBank)"}</h4>
                        {paymentSettings.bank_branch && (
                          <p className="text-[11px] text-gray-500">{paymentSettings.bank_branch}</p>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      Official Bank Account
                    </span>
                  </div>

                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">Account Name:</span>
                      <strong className="text-gray-900 font-medium">{paymentSettings.account_name || "Silver Hawk Group Co., Ltd."}</strong>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-500">Account Number:</span>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-sm text-gray-900 tracking-wider">
                          {paymentSettings.account_number || "045-8-91234-0"}
                        </strong>
                        <button
                          type="button"
                          onClick={handleCopyAccount}
                          className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-[#B89450] hover:text-white transition"
                        >
                          {accountCopied ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {paymentSettings.swift_code && (
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">SWIFT / BIC:</span>
                        <span className="font-mono text-xs text-gray-700">{paymentSettings.swift_code}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-gray-500">Amount to Transfer:</span>
                      <strong className="font-mono text-base font-bold text-[#B89450]">
                        ฿{finalAmount.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                    {isChinese
                      ? "转账及上传收据步骤"
                      : isThai
                      ? "ขั้นตอนการโอนเงินและอัปโหลดหลักฐาน"
                      : "Direct Bank Transfer & Receipt Steps"}
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                    <li>
                      {isChinese
                        ? "使用手机银行（KBank、SCB、BBL等）或柜台转账至上述账号。"
                        : isThai
                        ? "โอนเงินเข้าบัญชีธนาคารกสิกรไทยด้านบนตามยอดเงินที่ระบุ"
                        : "Transfer exact amount to the KBank account above via mobile banking app or ATM."}
                    </li>
                    <li>
                      {isChinese
                        ? "确保转账金额准确无误："
                        : isThai
                        ? "ตรวจสอบยอดโอนให้ตรงกับจำนวน："
                        : "Verify exact amount: "}
                      <strong className="text-gray-900">฿{finalAmount.toLocaleString()}</strong>.
                    </li>
                    <li>
                      {isChinese
                        ? "转账成功后保存转账凭证/电子回单截图。"
                        : isThai
                        ? "บันทึกรูปภาพสลิปหรือหลักฐานการโอนเงินลงในอุปกรณ์ของคุณ"
                        : "Save or screenshot the transfer slip / confirmation receipt."}
                    </li>
                    <li>
                      {isChinese
                        ? "在下方上传凭证。运营团队核实后将立即为您确认预订。"
                        : isThai
                        ? "อัปโหลดสลิปหลักฐานด้านล่าง เจ้าหน้าที่จะตรวจสอบและยืนยันการจอง"
                        : "Upload the payment slip below. Admin team will review and confirm your booking."}
                    </li>
                  </ol>
                </div>

                {/* Upload Receipt Container */}
                <div className="rounded-xl border-2 border-dashed border-[#B89450]/60 bg-[#FAF8F3]/60 p-4">
                  <label className="block text-xs font-bold text-gray-800 mb-2">
                    {isChinese
                      ? "上传银行转账凭证 / 支付收据"
                      : isThai
                      ? "อัปโหลดสลิปการโอนเงินธนาคาร"
                      : "Upload Bank Transfer Slip / Receipt"}{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="file"
                    id="bank-slip-upload-input"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="bank-slip-upload-input"
                      className="cursor-pointer rounded-lg bg-[#B89450] px-4 py-2 text-xs font-bold text-white hover:bg-[#A38240] transition shadow-xs"
                    >
                      {slipUploaded ? "Replace Slip" : "Choose Slip File"}
                    </label>
                    <span className="text-xs text-gray-600 truncate max-w-xs">
                      {slipFile ? slipFile.name : "No file chosen yet (JPG, PNG, PDF)"}
                    </span>
                  </div>

                  {/* Slip Image Preview */}
                  {slipPreview && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/70 p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slipPreview}
                        alt="Uploaded Bank Slip"
                        className="h-16 w-16 rounded-md object-cover border border-green-300 shadow-xs"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-green-800 flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-600 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Bank Transfer Slip Attached
                        </p>
                        <p className="text-[11px] text-green-600">
                          Ready to submit for admin review & confirmation
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total & Fee Breakdown */}
        <div className="mb-6 rounded-2xl bg-white border border-[#D6CEBD] p-6 shadow-xs">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Tour Subtotal</span>
              <span>฿{baseAmount.toLocaleString()}</span>
            </div>

            {paymentMethod === "card" && (
              <div className="flex justify-between text-amber-700 text-xs font-medium bg-amber-50 p-2 rounded-lg">
                <span>Credit / Debit Card Processing Fee (4%)</span>
                <span>+฿{cardFee.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-base font-bold text-[#282722]">
                {isChinese ? "总金额" : isThai ? "ยอดรวมทั้งสิ้น" : "Total Amount"}
              </span>
              <span className="text-2xl font-bold text-[#B89450] font-mono">
                ฿{finalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <button
          type="button"
          onClick={handlePayment}
          disabled={isPaying}
          className="block w-full rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-6 py-4 text-center font-bold text-[#282722] shadow-md shadow-[#B89450]/20 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPaying
            ? isChinese
              ? "处理中..."
              : "Processing..."
            : isChinese
              ? `确认支付 ฿${finalAmount.toLocaleString()}`
              : `Confirm & Pay ฿${finalAmount.toLocaleString()}`}
        </button>

        {/* Security Notice */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>256-bit SSL Encrypted Payment Gateway • Powered by Stripe & Kasikornbank</span>
        </div>

      </div>
    </main>
  );
}

export default function Payment() {
  const stripePromise = useMemo(() => getStripeClientPromise(), []);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
          Loading payment gateway...
        </div>
      }
    >
      <Elements stripe={stripePromise}>
        <PaymentContent />
      </Elements>
    </Suspense>
  );
}
