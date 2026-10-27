import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("Bookings")
    .select(`
      *,
      payments (
        status,
        payment_method,
        amount,
        paid_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="mb-4 text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-red-600">
          Failed to load bookings: {error.message}
        </p>
      </main>
    );
  }

  const totalBookings = bookings?.length || 0;

  const paidBookings =
    bookings?.filter((booking) => booking.status === "paid").length || 0;

  const pendingBookings =
    bookings?.filter((booking) => booking.status === "pending").length || 0;

  const totalRevenue =
    bookings?.reduce((total, booking) => {
      const payment = booking.payments?.[0];

      if (payment?.status === "paid") {
        return total + Number(payment.amount || 0);
      }

      return total;
    }, 0) || 0;

  return (
    <main className="min-h-screen bg-gray-100">
      

          {/* Summary Cards */}
          <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

            {/* Total Bookings */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Bookings
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalBookings}
              </p>
            </div>

            {/* Paid */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Paid Bookings
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {paidBookings}
              </p>
            </div>

            {/* Pending */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Pending Bookings
              </p>

              <p className="mt-2 text-3xl font-bold text-orange-500">
                {pendingBookings}
              </p>
            </div>

            {/* Revenue */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Revenue
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                ฿{totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="rounded-2xl bg-white shadow-sm">

            <div className="border-b p-6">
              <h3 className="text-xl font-bold text-gray-900">
                Recent Bookings
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Latest booking and payment information
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">

                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-sm font-semibold">
                      Booking ID
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Customer
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Guests
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Travel Date
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Booking Status
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Payment
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Method
                    </th>

                    <th className="p-4 text-sm font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {bookings?.map((booking) => {
                    const payment = booking.payments?.[0];

                    return (
                      <tr
                        key={booking.id}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-4 font-medium">
                          {booking.booking_code || `BK-${booking.id}`}
                        </td>

                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {booking.customer_name}
                            </p>

                            <p className="text-sm text-gray-500">
                              {booking.customer_email}
                            </p>
                          </div>
                        </td>

                        <td className="p-4">
                          {booking.guests}
                        </td>

                        <td className="p-4">
                          {booking.travel_date}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              booking.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : booking.status === "pending"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>

                        <td className="p-4">
                          {payment?.status || "-"}
                        </td>

                        <td className="p-4">
                          {payment?.payment_method || "-"}
                        </td>

                        <td className="p-4 font-medium">
                          {payment?.amount
                            ? `฿${Number(
                                payment.amount
                              ).toLocaleString()}`
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          </div>

    </main>
  );
}