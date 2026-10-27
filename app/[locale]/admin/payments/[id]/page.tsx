import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function PaymentDetailPage({
  params,
}: PageProps) {
  const { locale, id } = await params;

  const paymentId = Number(id);

  const supabase = await createClient();

  // ==========================================
  // 1. Get Payment
  // ==========================================

  const { data: payment, error: paymentError } =
    await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

  // Payment not found
  if (paymentError || !payment) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <Link
          href={`/${locale}/admin/payments`}
          className="font-medium text-[#17352A] hover:underline"
        >
          ← Back to Payments
        </Link>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-red-600">
            Payment not found
          </h1>

          <p className="mt-2 text-gray-500">
            {paymentError?.message ||
              "This payment does not exist."}
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // 2. Get Related Booking
  // ==========================================

  const { data: booking, error: bookingError } =
    await supabase
      .from("Bookings")
      .select("*")
      .eq("id", payment.booking_id)
      .maybeSingle();

  return (
    <main className="min-h-screen bg-gray-100 p-8">

      {/* ======================================
          Back
      ====================================== */}

      <Link
        href={`/${locale}/admin/payments`}
        className="inline-block font-medium text-[#17352A] hover:underline"
      >
        ← Back to Payments
      </Link>

      {/* ======================================
          Header
      ====================================== */}

      <div className="mt-6 mb-8">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-sm text-gray-500">
              Payment Detail
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#17352A]">
              Payment #{payment.id}
            </h1>
          </div>

          {/* Payment Status */}

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              payment.status === "paid"
                ? "bg-green-100 text-green-700"
                : payment.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {payment.status}
          </span>

        </div>

      </div>

      {/* ======================================
          Main Content
      ====================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ==================================
            Payment Information
        ================================== */}

        <section className="rounded-2xl bg-white p-6 shadow">

          <h2 className="mb-6 text-xl font-bold text-[#17352A]">
            Payment Information
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">

            {/* Payment ID */}

            <div>
              <p className="text-sm text-gray-500">
                Payment ID
              </p>

              <p className="mt-1 font-medium">
                {payment.id}
              </p>
            </div>

            {/* Booking ID */}

            <div>
              <p className="text-sm text-gray-500">
                Booking ID
              </p>

              <Link
                href={`/${locale}/admin/bookings/${payment.booking_id}`}
                className="mt-1 block font-medium text-[#17352A] hover:underline"
              >
                BK-{payment.booking_id}
              </Link>
            </div>

            {/* Payment Status */}

            <div>
              <p className="text-sm text-gray-500">
                Payment Status
              </p>

              <p className="mt-1 font-medium capitalize">
                {payment.status}
              </p>
            </div>

            {/* Payment Method */}

            <div>
              <p className="text-sm text-gray-500">
                Payment Method
              </p>

              <p className="mt-1 font-medium">
                {payment.payment_method || "-"}
              </p>
            </div>

            {/* Amount */}

            <div>
              <p className="text-sm text-gray-500">
                Amount
              </p>

              <p className="mt-1 text-lg font-semibold">
                ฿
                {Number(
                  payment.amount || 0
                ).toLocaleString()}
              </p>
            </div>

            {/* Paid At */}

            <div>
              <p className="text-sm text-gray-500">
                Paid At
              </p>

              <p className="mt-1 font-medium">
                {payment.paid_at
                  ? new Date(
                      payment.paid_at
                    ).toLocaleString()
                  : "-"}
              </p>
            </div>

          </div>

        </section>

        {/* ==================================
            Related Booking
        ================================== */}

        <section className="rounded-2xl bg-white p-6 shadow">

          <h2 className="mb-6 text-xl font-bold text-[#17352A]">
            Related Booking
          </h2>

          {bookingError ? (
            <p className="text-sm text-red-500">
              Unable to load booking information.
            </p>
          ) : booking ? (

            <div className="space-y-5">

              {/* Booking ID */}

              <div>
                <p className="text-sm text-gray-500">
                  Booking ID
                </p>

                <Link
                  href={`/${locale}/admin/bookings/${booking.id}`}
                  className="mt-1 block text-lg font-semibold text-[#17352A] hover:underline"
                >
                  BK-{booking.id}
                </Link>
              </div>

              {/* Customer */}

              <div>
                <p className="text-sm text-gray-500">
                  Customer
                </p>

                <p className="mt-1 font-medium">
                  {booking.customer_name}
                </p>
              </div>

              {/* Email */}

              <div>
                <p className="text-sm text-gray-500">
                  Email
                </p>

                <p className="mt-1 break-all font-medium">
                  {booking.customer_email}
                </p>
              </div>

              {/* Travel Date */}

              <div>
                <p className="text-sm text-gray-500">
                  Travel Date
                </p>

                <p className="mt-1 font-medium">
                  {booking.travel_date}
                </p>
              </div>

              {/* Guests */}

              <div>
                <p className="text-sm text-gray-500">
                  Guests
                </p>

                <p className="mt-1 font-medium">
                  {booking.guests}
                </p>
              </div>

              {/* Booking Status */}

              <div>
                <p className="text-sm text-gray-500">
                  Booking Status
                </p>

                <p className="mt-1 font-medium capitalize">
                  {booking.status}
                </p>
              </div>

            </div>

          ) : (

            <div className="rounded-xl bg-gray-50 p-5">

              <p className="font-medium text-gray-700">
                Booking not found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                The booking connected to this payment
                could not be found.
              </p>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}