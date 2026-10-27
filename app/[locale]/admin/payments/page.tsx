
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PaymentSearch from "./PaymentSearch";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const locale = await getLocale();
  const supabase = createAdminClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select(`
      id,
      booking_id,
      status,
      payment_method,
      amount,
      paid_at,
      created_at,
      booking:Bookings!payments_booking_id_fkey (
        booking_code
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="mb-4 text-3xl font-bold">
          Payment Management
        </h1>

        <p className="text-red-600">
          Failed to load payments: {error.message}
        </p>
      </main>
    );
  }

  const paymentRows = (payments ?? []).map((payment) => {
    const booking = Array.isArray(payment.booking)
      ? payment.booking[0]
      : payment.booking;

    return {
      id: payment.id,
      booking_id: payment.booking_id,
      booking_code: booking?.booking_code ?? null,
      status: payment.status,
      payment_method: payment.payment_method,
      amount: payment.amount,
      paid_at: payment.paid_at,
      created_at: payment.created_at,
    };
  });

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Payment Management
            </h1>

            <p className="mt-2 text-gray-500">
              Manage, review, and reconcile customer payments and uploaded receipts
            </p>
          </div>

          <Link
            href={`/${locale}/admin/settings?tab=payment`}
            className="flex items-center gap-2 rounded-xl bg-white border border-[#B89450]/40 px-4 py-2.5 text-xs font-bold text-[#17352A] shadow-xs hover:bg-[#FAF8F3] hover:border-[#B89450] transition"
          >
            <span>⚙️</span>
            <span>Configure PromptPay QR & Bank Account</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              Admin
            </span>
          </Link>
        </div>

        <PaymentSearch payments={paymentRows} />
      </div>
    </main>
  );
}
