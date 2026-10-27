
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

type Booking = {
  id: number;
  booking_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  guests: number | null;
  travel_date: string | null;
  status: string | null;
};

export default function BookingSearch({
  bookings,
}: {
  bookings: Booking[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Cancellation / Rejection modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [selectedReason, setSelectedReason] = useState(
    "Weather is not good: Severe Andaman weather & high sea swell advisory"
  );
  const [customReason, setCustomReason] = useState("");

  const PRESET_REASONS = [
    "Weather is not good: Severe Andaman weather & high sea swell advisory",
    "Weather warning: Marine Dept small-boat ban due to monsoon squall",
    "Tour minimum passenger quota not met (Full refund or free date change offered)",
    "National Park marine closure / environmental protection directive",
    "Technical vessel maintenance & safety inspection",
    "Customer requested cancellation within policy terms",
  ];

  const router = useRouter();
  const locale = useLocale();

  // Search & Filter
  const filteredBookings = bookings.filter((booking) => {
    const keyword = search.toLowerCase().trim();
    const status = (booking.status || "").toLowerCase();
console.log("Booking status:", booking.id, status)
    const displayBookingId =
  booking.booking_code || `BK-${booking.id}`;

const matchesSearch =
  displayBookingId.toLowerCase().includes(keyword) ||
  String(booking.id).includes(keyword) ||
  (booking.customer_name || "")
    .toLowerCase()
    .includes(keyword) ||
  (booking.customer_email || "")
    .toLowerCase()
    .includes(keyword);

    const matchesStatus =
      statusFilter === "all" ||
      status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Status update
  const handleApprove = async (bookingId: number) => {
    if (!window.confirm("Approve this booking after reviewing its details? An official approval email will be sent.")) return;
    setUpdatingId(bookingId);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: "approved" }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        alert(result?.error || "Failed to approve booking.");
        return;
      }
      alert("Booking approved successfully. Approval email dispatched.");
      router.refresh();
    } catch {
      alert("Unable to connect to the server.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenCancelModal = (booking: Booking) => {
    setCancelModalBooking(booking);
    setSelectedReason(PRESET_REASONS[0]);
    setCustomReason("");
  };

  const handleConfirmCancellation = async () => {
    if (!cancelModalBooking) return;
    const finalReason = customReason.trim() || selectedReason || "Weather conditions / operational safety";
    setUpdatingId(cancelModalBooking.id);
    try {
      const response = await fetch(`/api/admin/bookings/${cancelModalBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          status: "cancelled",
          rejectReason: finalReason,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        alert(result?.error || "Failed to cancel booking.");
        return;
      }
      alert("Booking cancelled/declined. Notification email with official reason sent to customer.");
      setCancelModalBooking(null);
      router.refresh();
    } catch {
      alert("Unable to connect to the server.");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusStyle: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    approved: "bg-purple-100 text-purple-700",
    paid: "bg-green-100 text-green-700",
    confirmed: "bg-blue-100 text-blue-700",
    confirm: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const statusLabel: Record<string, string> = {
    pending: "Pending Review",
    approved: "Approved",
    paid: "Paid",
    confirmed: "Confirmed",
    confirm: "Confirm (Legacy)",
    cancelled: "Cancelled",
  };

  const counts = {
    pending: bookings.filter(
      (b) => b.status === "pending"
    ).length,
    approved: bookings.filter(
      (b) => b.status === "approved"
    ).length,
    paid: bookings.filter(
      (b) => b.status === "paid"
    ).length,
    confirmed: bookings.filter(
      (b) =>
        b.status === "confirmed" ||
        b.status === "confirm"
    ).length,
  };

  return (
    <>
      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Pending Review",
            count: counts.pending,
            color: "text-orange-600",
          },
          {
            label: "Approved",
            count: counts.approved,
            color: "text-purple-600",
          },
          {
            label: "Paid",
            count: counts.paid,
            color: "text-green-600",
          },
          {
            label: "Confirmed",
            count: counts.confirmed,
            color: "text-blue-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-gray-500">
              {item.label}
            </p>
            <p className={`mt-2 text-3xl font-bold ${item.color}`}>
              {item.count}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <input
          type="text"
          placeholder="Search Booking ID, customer, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#17352A]"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#17352A]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Result Count */}
      <div className="mb-4 text-sm text-gray-500">
        Showing {filteredBookings.length} of{" "}
        {bookings.length} bookings
      </div>

      {/* Booking Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Booking ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Email</th>
              <th className="p-4">Guests</th>
              <th className="p-4">Travel Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => {
                const status = (
                  booking.status || ""
                ).toLowerCase();

                const isUpdating =
                  updatingId === booking.id;

                return (
                  <tr
                    key={booking.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <a
                        href={`/${locale}/admin/bookings/${booking.id}`}
                        className="font-medium text-[#17352A] hover:underline"
                      >
                       {booking.booking_code || `BK-${booking.id}`}
                      </a>
                    </td>

                    <td className="p-4">
                      {booking.customer_name || "-"}
                    </td>

                    <td className="p-4">
                      {booking.customer_email || "-"}
                    </td>

                    <td className="p-4">
                      {booking.guests ?? "-"}
                    </td>

                    <td className="p-4">
                      {booking.travel_date || "-"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyle[status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabel[status] ||
                          booking.status ||
                          "Unknown"}
                      </span>
                    </td>

                    <td className="p-4">
                      {status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(booking.id)}
                            disabled={isUpdating}
                            className="rounded-lg bg-[#17352A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#244B3D] disabled:opacity-50 transition"
                          >
                            {isUpdating ? "Processing..." : "Approve"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(booking)}
                            disabled={isUpdating}
                            className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-50 transition"
                          >
                            Reject / Cancel
                          </button>
                        </div>
                      ) : status === "approved" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                            Ready for Payment
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(booking)}
                            disabled={isUpdating}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Completed / Cancelled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-gray-500"
                >
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cancellation & Rejection Reason Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-base font-bold text-gray-900">
                  Reject / Cancel Booking #{cancelModalBooking.booking_code || cancelModalBooking.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Customer: <strong className="text-gray-900">{cancelModalBooking.customer_name || "Customer"}</strong> ({cancelModalBooking.customer_email})<br />
              Please select or enter the official reason. An automated email will be sent to the customer explaining the cancellation and 100% refund / rescheduling options.
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-gray-700">
                Select Reason (e.g. Weather conditions):
              </label>
              {PRESET_REASONS.map((reason, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    selectedReason === reason
                      ? "border-red-500 bg-red-50 text-red-900 font-medium"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="preset_reason"
                    checked={selectedReason === reason}
                    onChange={() => {
                      setSelectedReason(reason);
                      setCustomReason("");
                    }}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Or enter custom reason:
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Weather is not good today. Strong thunderstorm and rough seas."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={updatingId !== null}
                onClick={handleConfirmCancellation}
                className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {updatingId ? "Cancelling..." : "Confirm & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}