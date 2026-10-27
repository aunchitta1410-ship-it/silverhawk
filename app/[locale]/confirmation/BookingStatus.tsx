
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
type BookingStatusProps = {
  bookingId: string;
  accessToken?: string;
  initialStatus: string;
  locale: string;
  children?: ReactNode;
};

const STEPS = [
  { key: "submitted", index: 0 },
  { key: "review", index: 1 },
  { key: "payment", index: 2 },
] as const;

export default function BookingStatus({
  bookingId,
  accessToken,
  initialStatus,
  locale,
  children,
}: BookingStatusProps) {
  const t = useTranslations("bookingProgress");
  const refreshErrorMessage = t("refreshError");
  const router = useRouter();

  // Defensively normalize the initial status so a missing prop cannot crash the page.
  const normalizedInitialStatus = String(initialStatus ?? "pending").trim().toLowerCase();
  const [status, setStatus] = useState(normalizedInitialStatus);
  const [error, setError] = useState("");
  const redirectStarted = useRef(false);

  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isPaid = status === "paid";
  const isRejected = status === "rejected";
  const isCancelled = status === "cancelled";
  const isDeclined = isRejected || isCancelled;
const heading = isRejected
  ? "We’re sorry, your booking request was not approved."
  : isCancelled
    ? "Your booking has been cancelled."
    : isApproved
      ? "Your booking request has been approved."
      : isPaid
        ? "Your payment has been received."
        : "Your booking request has been received.";

const subheading = isRejected
  ? "We apologize for the inconvenience."
  : isCancelled
    ? "This booking is no longer active."
    : isApproved
      ? "Your booking is approved. Please continue to payment."
      : isPaid
        ? "Thank you for booking with Silver Hawk Group."
        : "Thank you for choosing Silver Hawk Group. Your request is awaiting admin review.";
  // Poll while the booking is pending or under verification.
  useEffect(() => {
    if (
      normalizedInitialStatus !== "pending" &&
      normalizedInitialStatus !== "pending_verification" &&
      normalizedInitialStatus !== "pending_review"
    ) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function fetchStatus(): Promise<void> {
      if (!active) return;

      controller = new AbortController();
      let shouldContinue = false;

      try {
        const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
        const response = await fetch(
          `/api/bookings/${encodeURIComponent(bookingId)}/status${tokenParam}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          if (active) setError(refreshErrorMessage);
          shouldContinue = true;
          return;
        }

        const data: { status?: unknown } = await response.json();

        if (!active || typeof data.status !== "string") return;

        const nextStatus = data.status.trim().toLowerCase();

        setStatus(nextStatus);
        setError("");

        shouldContinue =
          nextStatus === "pending" ||
          nextStatus === "pending_verification" ||
          nextStatus === "pending_review";
      } catch (err) {
        if (
          active &&
          !(err instanceof Error && err.name === "AbortError")
        ) {
          setError(refreshErrorMessage);
          shouldContinue = true;
        }
      } finally {
        if (active && shouldContinue) {
          timeoutId = setTimeout(() => {
            void fetchStatus();
          }, 10000);
        }
      }
    }

    void fetchStatus();

    return () => {
      active = false;
      controller?.abort();

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    bookingId,
    accessToken,
    normalizedInitialStatus,
    refreshErrorMessage,
  ]);

  // Redirect only after approval.
  useEffect(() => {
    if (!isApproved || redirectStarted.current) return;

    redirectStarted.current = true;

    router.replace(
      `/${locale}/Payment?bookingId=${encodeURIComponent(bookingId)}`
    );
  }, [isApproved, locale, bookingId, router]);

  const completedSteps = isDeclined
    ? 0
    : isPaid
      ? 3
      : isApproved
        ? 2
        : 1;

  const currentStep = isPending
    ? 1
    : isApproved
      ? 2
      : null;

  const progressWidth = isDeclined
    ? "0%"
    : isPaid
      ? "66.66%"
      : isApproved
        ? "33.33%"
        : "0%";

  const statusMessage = isPaid
    ? t("paidMessage")
    : isApproved
      ? t("approvedMessage")
      : isRejected
        ? "Your booking request was not approved."
        : isCancelled
          ? "Your booking has been cancelled."
          : t("pendingMessage");

  const statusLabel = isPaid
    ? t("statusPaid")
    : isApproved
      ? t("statusApproved")
      : isRejected
        ? "Rejected"
        : isCancelled
          ? "Cancelled"
          : t("statusPending");

  const statusClass = isPending
    ? "bg-[#FBF3DF] text-[#795D24]"
    : isApproved || isPaid
      ? "bg-[#E5F3E8] text-[#24643A]"
      : "bg-red-50 text-red-800";

  return (
    <div className="w-full space-y-5">
      <section
        aria-label={t("title")}
        className={`rounded-xl px-4 py-5 text-white sm:px-6 ${
          isDeclined ? "bg-[#111111] border border-red-200" : "bg-[#111111]"
        }`}
      >
        <p className="mb-3 text-center text-base font-semibold uppercase tracking-[0.24em] text-[#D4AF65] sm:text-lg">
          SILVER HAWK
        </p>

        <h2 className="mb-5 text-center text-base font-semibold text-white">
          {t("title")}
        </h2>

        <div className="relative">
          <div className="absolute left-[16.67%] right-[16.67%] top-[9px] h-[2px] bg-[#555555]" />

          {!isDeclined && (
            <div
              className="absolute left-[16.67%] top-[9px] h-[2px] bg-[#D4AF65] transition-all duration-500"
              style={{ width: progressWidth }}
            />
          )}

          <div className="relative grid grid-cols-3">
            {STEPS.map((step) => {
              const isRejectedStep =
                isDeclined && step.key === "review";

              const isAfterRejection =
                isDeclined && step.key === "payment";

              const done =
                !isDeclined && step.index < completedSteps;

              const current =
                !isDeclined && step.index === currentStep;

              const stepLabel = isRejectedStep
                ? isRejected
                  ? "Rejected"
                  : "Cancelled"
                : t(step.key);

              return (
                <div
                  key={step.key}
                  className="flex min-w-0 flex-col items-center text-center"
                >
                  <div
                    className={[
                      "z-10 flex h-5 w-5 items-center justify-center rounded-full border-2",
                      isRejectedStep
                        ? "border-red-500 bg-red-500"
                        : isAfterRejection
                          ? "border-gray-500 bg-[#111111] opacity-40"
                          : done
                            ? "border-[#D4AF65] bg-[#D4AF65]"
                            : current
                              ? "border-[#D4AF65] bg-[#111111] ring-4 ring-[#D4AF65]/25"
                              : "border-[#888888] bg-[#111111]",
                    ].join(" ")}
                  >
                    {isRejectedStep && (
                      <span className="text-sm font-bold leading-none text-white">
                        ×
                      </span>
                    )}

                    {done && (
                      <svg className="w-2.5 h-2.5 text-[#111111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}

                    {current && (
                      <span className="h-2 w-2 rounded-full bg-[#D4AF65]" />
                    )}
                  </div>

                  <p
                    className={[
                      "mt-2 text-xs font-semibold sm:text-sm",
                      isRejectedStep
                        ? "text-red-400"
                        : isAfterRejection
                          ? "text-gray-500 line-through opacity-50"
                          : done || current
                            ? "text-[#D4AF65]"
                            : "text-gray-400",
                    ].join(" ")}
                  >
                    {stepLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

     <header className="mb-5 text-center">
  <h1
    className={`text-2xl font-bold sm:text-3xl ${
      isRejected || isCancelled
        ? "text-red-800"
        : "text-[#1C2119]"
    }`}
  >
    {heading}
  </h1>

  <p className="mt-2 text-sm leading-6 text-gray-600">
    {subheading}
  </p>
</header>

{children}

      {/* Hide this entire section for rejected/cancelled bookings.
          The page heading already explains the final status. */}
      {!isDeclined && (
        <section
          aria-live="polite"
          className="border-t border-[#E6E0D5] pt-4"
        >
          {!children && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold text-[#1C2119]">
                Booking #{bookingId}
              </p>

              <span
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>
          )}

          <p className="text-sm leading-6 text-gray-700">
            {statusMessage}
          </p>

          {isPending && (
            <>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {t("pendingPaymentNotice")}
              </p>

              <button
                type="button"
                disabled
                className="mt-4 flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-600"
              >
                Waiting for Admin Approval
              </button>
            </>
          )}

          {isApproved && (
            <div className="mt-4 rounded-xl bg-[#F8F6F0] p-4 text-center" role="status">
              <p className="font-semibold text-[#795D24]">
                Your booking has been approved. Redirecting to payment...
              </p>

              <a
                href={`/${locale}/Payment?bookingId=${encodeURIComponent(bookingId)}`}
                className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#B89550] px-5 py-3 text-sm font-semibold text-[#111111]"
              >
                Proceed to Payment
              </a>
            </div>
          )}

          {isPaid && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {t("paidMessage")}
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600" role="status">
              {error}
            </p>
          )}
        </section>
      )}
      <div className="border-t border-[#E6E0D5] pt-5">
  <a
    href={`/${locale}`}
    className="flex min-h-12 w-full items-center justify-center rounded-full border border-[#B89550] bg-white px-5 py-3 text-sm font-semibold text-[#795D24] transition hover:bg-[#F8F6F0] focus:outline-none focus:ring-2 focus:ring-[#B89550] focus:ring-offset-2"
  >
    Back to Home Page
  </a>
</div>
    </div>
  );
}
