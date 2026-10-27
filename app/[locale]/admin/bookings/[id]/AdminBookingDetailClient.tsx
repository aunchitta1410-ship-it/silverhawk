"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingPickupDetails } from "@/lib/booking-pickup";
import { AdultIcon, ChildIcon, InfantIcon } from "@/app/components/PassengerIcons";
import TourVoucher, { type TourVoucherData } from "@/app/components/TourVoucher";

type GuestDetail = {
  id: number;
  booking_id: number;
  guest_number: number;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  guest_type: string | null;
  phone: string | null;
  email: string | null;
  dietary_requirements: string[] | null;
  allergies: string[] | null;
  other_requests: string | null;
  created_at: string;
};

type Booking = {
  id: number;
  created_at: string;
  tour_id: number;
  travel_date: string;
  customer_name: string;
  customer_email: string;
  guests: number;
  status: string;
  admin_reviewed_at: string | null;
  admin_remark: string | null;
  approved_at: string | null;
  payment_link: string | null;
  booking_code: string | null;
  booking_reference: string | null;
  pdpa_acknowledged?: boolean | null;
  pdpa_acknowledged_at?: string | null;
  privacy_policy_version?: string | null;
};

type Tour = {
  id: number;
  title_en: string;
  title_zh?: string | null;
  title_th?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
  price?: number | null;
  child_price?: number | null;
  partner_company?: string | null;
};

type Payment = {
  id: number;
  booking_id: number;
  status: string;
  payment_method: string | null;
  amount: number | null;
  paid_at: string | null;
  created_at: string;
};

type Props = {
  booking: Booking;
  tour: Tour | null;
  payment: Payment | null;
  guestDetails: GuestDetail[];
  initialPickup: BookingPickupDetails | null;
  locale: string;
};

export default function AdminBookingDetailClient({
  booking: initialBooking,
  tour,
  payment,
  guestDetails,
  initialPickup,
  locale,
}: Props) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [pickup, setPickup] = useState<BookingPickupDetails | null>(initialPickup);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Cancellation Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedPresetReason, setSelectedPresetReason] = useState(
    "Severe Andaman weather & high sea swell warning (Marine Dept small-boat advisory)"
  );

  // Tour Voucher Modal state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherIssuedBy, setVoucherIssuedBy] = useState("Pin");

  // Dynamic Field / Internal Note state
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);
  const [fieldSuccessMessage, setFieldSuccessMessage] = useState<string | null>(null);
  const [fieldErrorMessage, setFieldErrorMessage] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    customer_name: booking.customer_name || "",
    customer_email: booking.customer_email || "",
    travel_date: booking.travel_date || "",
    guests: booking.guests || 1,
    status: booking.status || "pending",
    admin_remark: booking.admin_remark || "",
    transferType: pickup?.transferType || "Hotel pick-up",
    pickupArea: pickup?.pickupArea || "",
    hotelAddress: pickup?.hotelAddress || "",
    roomNumber: pickup?.roomNumber || "",
    meetingPoint: pickup?.meetingPoint || "",
    meetingTime: pickup?.meetingTime || "",
  });

  // Calculate passenger counts
  const adultCount = guestDetails.filter((g) => g.guest_type === "Adult").length;
  const childCount = guestDetails.filter((g) => g.guest_type === "Child").length;
  const infantCount = guestDetails.filter((g) => g.guest_type === "Infant").length;

  // Handle Quick Approve
  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this booking? An approval email will be sent to the customer.")) return;
    setLoadingAction("approve");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve booking");
      setBooking((prev) => ({ ...prev, status: "approved" }));
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setLoadingAction(null);
    }
  };

  // Preset cancellation reasons
  const PRESET_REASONS = [
    "Weather is not good: Severe Andaman weather & high sea swell warning (Marine Dept small-boat advisory)",
    "Weather conditions: Adverse weather forecasted, unsafe for marine excursions",
    "Tour minimum passenger quota not met (Full refund or free date change offered)",
    "National Park marine closure / environmental protection directive",
    "Technical vessel maintenance & safety inspection",
    "Customer requested cancellation within policy terms",
  ];

  // Open Cancel Modal
  const handleOpenCancelModal = () => {
    setSelectedPresetReason(PRESET_REASONS[0]);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  // Submit Cancellation with Reason
  const handleSubmitCancellation = async () => {
    const finalReason =
      cancellationReason.trim() ||
      selectedPresetReason ||
      "Operational or weather safety conditions.";

    setLoadingAction("cancel");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          rejectReason: finalReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel booking");

      setBooking((prev) => ({
        ...prev,
        status: "cancelled",
        admin_remark: `Cancellation reason: ${finalReason}`,
      }));
      setShowCancelModal(false);
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Cancellation failed"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  // Add Dynamic Custom Field / Internal Note to Booking
  const handleAddDynamicField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldKey.trim() || !newFieldValue.trim()) return;
    setIsAddingField(true);
    setFieldSuccessMessage(null);
    setFieldErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_note",
          key: newFieldKey.trim(),
          value: newFieldValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add dynamic field");

      if (data.pickup) {
        setPickup(data.pickup);
      } else {
        setPickup((prev) =>
          prev
            ? {
                ...prev,
                adminInternalNotes: [
                  ...(prev.adminInternalNotes || []),
                  {
                    id: `field_${Date.now()}`,
                    key: newFieldKey.trim(),
                    value: newFieldValue.trim(),
                    addedAt: new Date().toISOString(),
                  },
                ],
              }
            : {
                bookingId: booking.id,
                transferType: "Hotel pick-up",
                pickupRequired: true,
                adminInternalNotes: [
                  {
                    id: `field_${Date.now()}`,
                    key: newFieldKey.trim(),
                    value: newFieldValue.trim(),
                    addedAt: new Date().toISOString(),
                  },
                ],
              }
        );
      }
      setFieldSuccessMessage(`Added "${newFieldKey.trim()}" successfully.`);
      setNewFieldKey("");
      setNewFieldValue("");
      router.refresh();
      setTimeout(() => setFieldSuccessMessage(null), 4000);
    } catch (err) {
      setFieldErrorMessage(
        err instanceof Error ? err.message : "Failed to add dynamic field"
      );
    } finally {
      setIsAddingField(false);
    }
  };

  // Handle Save Full Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("saving_edit");
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          customer_name: editForm.customer_name,
          customer_email: editForm.customer_email,
          travel_date: editForm.travel_date,
          guests: editForm.guests,
          status: editForm.status,
          admin_remark: editForm.admin_remark,
          pickup: {
            transferType: editForm.transferType,
            pickupRequired: editForm.transferType === "Hotel pick-up",
            pickupArea: editForm.pickupArea,
            hotelAddress: editForm.hotelAddress,
            roomNumber: editForm.roomNumber,
            meetingPoint: editForm.meetingPoint,
            meetingTime: editForm.meetingTime,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save booking edits");

      setBooking((prev) => ({
        ...prev,
        customer_name: editForm.customer_name,
        customer_email: editForm.customer_email,
        travel_date: editForm.travel_date,
        guests: editForm.guests,
        status: editForm.status,
        admin_remark: editForm.admin_remark,
      }));

      setPickup({
        bookingId: booking.id,
        transferType: editForm.transferType,
        pickupRequired: editForm.transferType === "Hotel pick-up",
        pickupArea: editForm.pickupArea,
        hotelAddress: editForm.hotelAddress,
        roomNumber: editForm.roomNumber,
        meetingPoint: editForm.meetingPoint,
        meetingTime: editForm.meetingTime,
      });

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoadingAction(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    paid: "bg-blue-100 text-blue-800 border-blue-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  };

  const currentStatusStyle = statusColors[booking.status] || "bg-gray-100 text-gray-800 border-gray-300";

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8 text-[#282722]">
      {/* Header bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/admin/bookings`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17352A] hover:underline"
          >
            <span>←</span> Back to Bookings
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-[#17352A] sm:text-3xl">
            Booking #{booking.booking_code || `BK-${booking.id}`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Created on {new Date(booking.created_at).toLocaleString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${currentStatusStyle}`}
          >
            {booking.status}
          </span>

          {/* Tour Voucher View & Print Button */}
          <button
            type="button"
            onClick={() => setShowVoucherModal(true)}
            className="rounded-lg border border-[#17352A] bg-[#17352A] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0e251c] transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>🎫</span>
            <span>View / Print Voucher</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-[#D6CEBD] bg-white px-3.5 py-1.5 text-xs font-bold text-[#282722] shadow-xs hover:border-[#B89450] hover:text-[#B89450] transition cursor-pointer"
          >
            Edit Booking
          </button>

          {booking.status === "pending" && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleApprove}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-green-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loadingAction === "approve" ? "Approving..." : "Approve"}
            </button>
          )}

          {booking.status !== "cancelled" && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleOpenCancelModal}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-medium text-red-700">
          {actionError}
        </div>
      )}

      {/* Cancellation Notice Banner (if cancelled) */}
      {booking.status === "cancelled" && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-bold text-sm">Tour Booking Cancelled</span>
          </div>
          <p className="mt-1 text-red-800">
            <strong>Official Reason:</strong> {booking.admin_remark || "Operational or weather safety conditions."}
          </p>
          <p className="mt-1 text-[11px] text-red-600">
            An automated cancellation email with this explanation and refund/rescheduling instructions was automatically dispatched to {booking.customer_email}.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Information & PDPA Compliance */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#17352A]">
              Customer Information
            </h2>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {booking.pdpa_acknowledged ? "✓ PDPA Consented" : "PDPA Recorded"}
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <p className="text-gray-500 font-medium">Customer Name</p>
              <p className="mt-0.5 font-bold text-[#282722] text-sm">
                {booking.customer_name}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Email Address</p>
              <p className="mt-0.5 font-medium text-[#282722] font-mono">
                {booking.customer_email}
              </p>
            </div>

            {/* Thailand PDPA Details Section */}
            <div className="mt-3 pt-3 border-t border-gray-100 bg-[#F4F9F8] p-3 rounded-xl border border-teal-100">
              <p className="font-bold text-[#17352A] text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>🛡️</span> Thailand PDPA (B.E. 2562) Compliance
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700">
                <div>
                  <span className="text-gray-500">Consent Status:</span>{" "}
                  <strong className="text-emerald-700">
                    {booking.pdpa_acknowledged ? "Active Consent" : "Acknowledged"}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Policy Version:</span>{" "}
                  <strong className="font-mono text-gray-800">
                    {booking.privacy_policy_version || "v1.0-pdpa-be2562"}
                  </strong>
                </div>
                {booking.pdpa_acknowledged_at && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Consent Timestamp:</span>{" "}
                    <span className="font-medium text-gray-800">
                      {new Date(booking.pdpa_acknowledged_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-gray-500 leading-tight">
                Data collected strictly for tour operation, mandatory Tourist Accident Insurance (Tourism Act B.E. 2551), and harbour manifests.
              </p>
            </div>
          </div>
        </section>

        {/* Booking Details */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-[#17352A]">
            Booking Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <p className="text-gray-500 font-medium">Travel Date</p>
              <p className="mt-0.5 font-bold text-[#282722] text-sm">
                {booking.travel_date}
              </p>
            </div>

            <div>
              <p className="text-gray-500 font-medium">Passenger Breakdown</p>
              <div className="mt-1 flex items-center gap-2 font-semibold">
                <span className="inline-flex items-center gap-1"><AdultIcon className="w-3.5 h-3.5 text-[#B89450]" /> {adultCount || 1}</span>
                {childCount > 0 && <span className="inline-flex items-center gap-1">• <ChildIcon className="w-3.5 h-3.5 text-[#B89450]" /> {childCount}</span>}
                {infantCount > 0 && <span className="inline-flex items-center gap-1">• <InfantIcon className="w-3.5 h-3.5 text-[#B89450]" /> {infantCount}</span>}
                <span className="text-gray-400 font-normal">
                  (Total: {booking.guests})
                </span>
              </div>
            </div>

            {booking.admin_remark && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 font-medium">Admin Remark / Notes</p>
                <p className="mt-0.5 rounded-lg bg-gray-50 p-2.5 text-gray-700 italic border border-gray-100">
                  {booking.admin_remark}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Pick-up / Transfer Information Card (Section 4.1.6) */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#17352A]">
              Pick-up & Transfer Information
            </h2>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-[#B89450] hover:underline"
            >
              Update Transfer Details
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs bg-[#FAF8F3] border border-[#D6CEBD]/60 p-4 rounded-xl">
            <div>
              <p className="text-[#736E62] font-medium">Transfer Option</p>
              <p className="mt-0.5 font-bold text-[#282722] text-sm">
                {pickup?.transferType || (pickup?.pickupRequired ? "Hotel pick-up" : "No Transfer")}
              </p>
            </div>

            <div>
              <p className="text-[#736E62] font-medium">Pick-up Area / Location</p>
              <p className="mt-0.5 font-semibold text-[#282722]">
                {pickup?.pickupArea || pickup?.meetingPoint || "—"}
              </p>
            </div>

            <div>
              <p className="text-[#736E62] font-medium">Meeting Time / Window</p>
              <p className="mt-0.5 font-semibold text-[#282722]">
                {pickup?.meetingTime || "As scheduled"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-[#736E62] font-medium">Hotel Address / Location Notes</p>
              <p className="mt-0.5 font-medium text-[#282722]">
                {pickup?.hotelAddress || pickup?.pickupNotes || "—"}
              </p>
            </div>

            <div>
              <p className="text-[#736E62] font-medium">Room Number</p>
              <p className="mt-0.5 font-bold font-mono text-[#282722]">
                {pickup?.roomNumber || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic Booking Fields, Add-ons & Extra Requirements */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#17352A] flex items-center gap-2">
                <span>🏷️</span> Dynamic Booking Specifications, Add-ons & Notes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dynamic customer questions, selected tiers, equipment add-ons, and admin internal attributes.
              </p>
            </div>
            {pickup?.ticketTier && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                Tier: {pickup.ticketTier}
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Client Tier & Add-ons & Question Answers */}
            <div className="space-y-4">
              {/* Ticket Tier & Add-on summary */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-xs">
                <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <span>🎟️</span> Selected Ticket Tier & Add-ons
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Selected Ticket Tier:</span>
                    <span className="font-semibold text-gray-900">
                      {pickup?.ticketTier || "Standard Tour Package"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Optional Add-ons Selected:</span>
                    <span className="font-semibold text-gray-900">
                      {pickup?.addonIds && pickup.addonIds.length > 0 ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {pickup.addonIds.map((aid, idx) => (
                            <span key={idx} className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-teal-800 text-[11px]">
                              {aid}
                            </span>
                          ))}
                        </span>
                      ) : (
                        "None selected"
                      )}
                    </span>
                  </div>
                  {pickup?.addonTotal && pickup.addonTotal > 0 ? (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                      <span className="text-gray-500">Add-ons Surcharge:</span>
                      <span className="font-bold text-[#B89450]">
                        +฿{Number(pickup.addonTotal).toLocaleString()}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Dynamic Tour Booking Questions (Answered by customer) */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-xs">
                <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <span>📝</span> Tour Custom Questions (Answered by Guest)
                </h3>
                {pickup?.customBookingData && Object.keys(pickup.customBookingData).length > 0 ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(pickup.customBookingData).map(([qKey, qVal]) => (
                      <div key={qKey} className="rounded-lg bg-white p-2.5 border border-gray-200/70">
                        <dt className="text-gray-500 text-[11px] font-medium capitalize">
                          {qKey.replace(/_/g, " ")}
                        </dt>
                        <dd className="font-bold text-gray-800 text-xs mt-0.5">
                          {String(qVal || "—")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-gray-400 italic text-[11px]">No specific custom tour questions required for this tour.</p>
                )}
              </div>

              {/* Customer Custom Extra Requests (Dynamic fields submitted by user) */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-xs">
                <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <span>✨</span> Customer Dynamic Extra Requests
                </h3>
                {pickup?.extraDynamicFields && pickup.extraDynamicFields.length > 0 ? (
                  <div className="space-y-1.5">
                    {pickup.extraDynamicFields.map((field, idx) => (
                      <div key={field.id || idx} className="flex items-center justify-between rounded-lg bg-white p-2 border border-gray-200/70">
                        <span className="font-medium text-gray-600 capitalize">{field.key}:</span>
                        <span className="font-bold text-[#17352A]">{field.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-[11px]">Customer submitted no extra dynamic requests.</p>
                )}
              </div>
            </div>

            {/* Right Column: Admin Internal Notes & Add New Dynamic Field */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-xs">
                <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                  <span>📌</span> Admin Dynamic Fields & Internal Notes
                </h3>
                {pickup?.adminInternalNotes && pickup.adminInternalNotes.length > 0 ? (
                  <div className="space-y-2">
                    {pickup.adminInternalNotes.map((note) => (
                      <div key={note.id} className="rounded-lg bg-white p-2.5 border border-amber-200/80 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#17352A]">{note.key}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(note.addedAt).toLocaleDateString()} {new Date(note.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-800 font-medium">{note.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-[11px] mb-2">No internal dynamic fields added yet.</p>
                )}

                {/* Form to add arbitrary dynamic field */}
                <form onSubmit={handleAddDynamicField} className="mt-4 pt-3 border-t border-gray-200 space-y-2.5">
                  <p className="font-bold text-[11px] text-[#17352A] flex items-center gap-1">
                    <span>+</span> Add Custom Field / Internal Note to Booking
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Field Name / Key
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tour Guide Language"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#B89450]"
                        disabled={isAddingField}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Field Value
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mandarin & English"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#B89450]"
                        disabled={isAddingField}
                      />
                    </div>
                  </div>

                  {fieldErrorMessage && (
                    <p className="text-[11px] text-red-600 font-medium">{fieldErrorMessage}</p>
                  )}
                  {fieldSuccessMessage && (
                    <p className="text-[11px] text-emerald-600 font-medium">{fieldSuccessMessage}</p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingField || !newFieldKey.trim() || !newFieldValue.trim()}
                      className="rounded-lg bg-[#17352A] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0e251c] disabled:opacity-40 transition cursor-pointer"
                    >
                      {isAddingField ? "Saving..." : "+ Save Field to Booking"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Tour Information */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-[#17352A]">
            Tour Information
          </h2>
          {tour ? (
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-500 font-medium">Tour Name</p>
                <p className="mt-0.5 font-bold text-sm text-[#17352A]">
                  {tour.title_en}
                </p>
              </div>
              {tour.description_en && (
                <div>
                  <p className="text-gray-500 font-medium">Description</p>
                  <p className="mt-0.5 text-gray-700 leading-relaxed">
                    {tour.description_en}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Tour details not found.</p>
          )}
        </section>

        {/* Payment Information */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-base font-bold text-[#17352A]">
            Payment Information
          </h2>
          {payment ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-gray-500 font-medium">Payment Status</p>
                  <p className={`mt-0.5 font-bold capitalize ${payment.status === "paid" ? "text-green-700" : "text-amber-700"}`}>
                    {payment.status === "paid" ? "Paid & Verified" : payment.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Payment Method</p>
                  <p className="mt-0.5 font-semibold text-[#282722] capitalize">
                    {payment.payment_method?.replace(/_/g, " ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Amount</p>
                  <p className="mt-0.5 font-bold text-sm text-[#B89450]">
                    ฿{Number(payment.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Paid At</p>
                  <p className="mt-0.5 font-medium text-gray-700">
                    {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "Awaiting Verification"}
                  </p>
                </div>
              </div>

              {/* Receipt Verification Box */}
              {payment.status !== "paid" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-amber-900 block">PromptPay Receipt Verification</span>
                    <span className="text-amber-700 text-[11px]">Customer uploaded transaction slip for review</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Confirm and verify this payment receipt? Status will be updated to Paid and voucher will be ready.")) return;
                        try {
                          await fetch("/api/admin/payments/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ bookingId: booking.id }),
                          });
                          alert("Payment verified successfully!");
                          router.refresh();
                        } catch {
                          alert("Failed to verify payment");
                        }
                      }}
                      className="rounded-lg bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-3.5 py-1.5 text-xs font-bold text-[#282722] shadow-xs hover:brightness-105"
                    >
                      Verify & Confirm Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
              No payment recorded yet for this booking.
            </div>
          )}
        </section>

        {/* Guest Information (Full List) */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2">
          <h2 className="mb-4 text-base font-bold text-[#17352A]">
            Guest Information ({guestDetails.length} Travelers)
          </h2>

          {guestDetails.length === 0 ? (
            <p className="text-xs text-gray-500">No guest records found.</p>
          ) : (
            <div className="space-y-4">
              {guestDetails.map((guest, idx) => (
                <div
                  key={guest.id || idx}
                  className="rounded-xl border border-gray-200 p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5 mb-3">
                    <h3 className="font-bold text-sm text-[#17352A]">
                      Guest {guest.guest_number || idx + 1}: {[guest.title, guest.first_name, guest.last_name].filter(Boolean).join(" ")}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        guest.guest_type === "Infant"
                          ? "bg-purple-100 text-purple-800"
                          : guest.guest_type === "Child"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {guest.guest_type === "Infant" ? (
                        <InfantIcon className="w-3.5 h-3.5 text-purple-700" />
                      ) : guest.guest_type === "Child" ? (
                        <ChildIcon className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <AdultIcon className="w-3.5 h-3.5 text-blue-700" />
                      )}
                      <span>{guest.guest_type || "Adult"}</span>
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-gray-500">Nationality</p>
                      <p className="font-medium text-gray-900 mt-0.5">{guest.nationality || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date of Birth</p>
                      <p className="font-medium text-gray-900 mt-0.5">{guest.date_of_birth || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900 mt-0.5">{guest.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium text-gray-900 mt-0.5 break-all">{guest.email || "—"}</p>
                    </div>

                    {(guest.dietary_requirements?.length || guest.allergies?.length || guest.other_requests) ? (
                      <div className="sm:col-span-4 mt-2 pt-2 border-t border-gray-100">
                        <p className="font-semibold text-gray-700">Special Requirements:</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {guest.dietary_requirements && guest.dietary_requirements.length > 0 && (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">
                              Diet: {guest.dietary_requirements.join(", ")}
                            </span>
                          )}
                          {guest.allergies && guest.allergies.length > 0 && (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-red-800">
                              Allergies: {guest.allergies.join(", ")}
                            </span>
                          )}
                          {guest.other_requests && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                              Notes: {guest.other_requests}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Edit Booking Modal (Section 4.1.4) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-[#17352A]">
                Edit Booking #{booking.booking_code || booking.id}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Travel Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.travel_date}
                    onChange={(e) => setEditForm({ ...editForm, travel_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Booking Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450] capitalize bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Transfer Details in Edit Modal */}
              <div className="border-t pt-3 space-y-3">
                <p className="font-bold text-sm text-[#17352A]">Pick-up & Transfer Settings</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Transfer Type
                    </label>
                    <select
                      value={editForm.transferType}
                      onChange={(e) => setEditForm({ ...editForm, transferType: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450] bg-white"
                    >
                      <option value="Hotel pick-up">Hotel pick-up</option>
                      <option value="No Transfer">No Transfer (Meeting Point)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Pick-up Area / Location
                    </label>
                    <input
                      type="text"
                      value={editForm.pickupArea}
                      onChange={(e) => setEditForm({ ...editForm, pickupArea: e.target.value })}
                      placeholder="e.g. Ao Nang, Krabi Town"
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Hotel Address / Location Notes
                    </label>
                    <input
                      type="text"
                      value={editForm.hotelAddress}
                      onChange={(e) => setEditForm({ ...editForm, hotelAddress: e.target.value })}
                      placeholder="Hotel name or address"
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Room Number
                    </label>
                    <input
                      type="text"
                      value={editForm.roomNumber}
                      onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                      placeholder="e.g. Room 402"
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Admin Remark / Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.admin_remark}
                  onChange={(e) => setEditForm({ ...editForm, admin_remark: e.target.value })}
                  placeholder="Notes for internal admin reference"
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs outline-none focus:border-[#B89450]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === "saving_edit"}
                  className="rounded-lg bg-[#17352A] px-5 py-2 text-xs font-bold text-white hover:bg-[#17352A]/90 disabled:opacity-50"
                >
                  {loadingAction === "saving_edit" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Cancellation Modal with Reason */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl text-[#282722]">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <span>⚠️</span> Cancel Tour Booking #{booking.booking_code || booking.id}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  An automatic notification email with your reason will be sent to {booking.customer_email}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Select Common Operational Reason:
                </label>
                <div className="space-y-1.5">
                  {PRESET_REASONS.map((preset) => (
                    <label
                      key={preset}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                        selectedPresetReason === preset
                          ? "border-red-400 bg-red-50/50 text-red-950 font-medium"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="presetReason"
                        checked={selectedPresetReason === preset}
                        onChange={() => {
                          setSelectedPresetReason(preset);
                          if (!cancellationReason) setCancellationReason(preset);
                        }}
                        className="mt-0.5 accent-red-600"
                      />
                      <span>{preset}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Custom Reason / Detailed Explanation for Customer:
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Due to sudden gale warnings and 3-meter sea swell issued by Phuket Marine Department, all speedboat operations to Phi Phi Islands are suspended today for safety."
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                <strong>Policy Reminder:</strong> If you cancel due to weather or quota, the customer is entitled to a 100% full refund or free rescheduling.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={loadingAction === "cancel"}
                onClick={handleSubmitCancellation}
                className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
              >
                {loadingAction === "cancel" ? "Cancelling & Emailing..." : "Confirm Cancellation & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Voucher View & Print Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:p-0 print:bg-transparent print:static print:overflow-visible">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl text-[#282722] my-8 print:m-0 print:p-0 print:max-w-none print:shadow-none print:border-none print:rounded-none print:w-full">
            <div className="flex items-center justify-between border-b pb-3 mb-4 print:hidden">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎫</span>
                <div>
                  <h3 className="text-base font-bold text-[#17352A]">
                    Official Tour Voucher — Silver Hawk
                  </h3>
                  <p className="text-xs text-gray-500">
                    Printable receipt and boarding voucher matching official format.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-semibold">Issued By:</span>
                  <input
                    type="text"
                    value={voucherIssuedBy}
                    onChange={(e) => setVoucherIssuedBy(e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-xs font-bold text-center"
                    placeholder="Pin"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Embedded Voucher */}
            <TourVoucher
              showPrintButton={true}
              data={{
                voucherNo: booking.booking_code?.replace(/^BK-/, "") || String(booking.id),
                issueDate: payment?.paid_at
                  ? new Date(payment.paid_at).toLocaleDateString("en-GB")
                  : new Date(booking.created_at).toLocaleDateString("en-GB"),
                tourService: tour?.title_en || "Silver Hawk Luxury Tour",
                company: tour?.partner_company || "Nikorn Marine",
                guestName: booking.customer_name || "Guest",
                hotel: pickup?.hotelAddress || "Andaman Cannacia",
                roomNo: pickup?.roomNumber || "217",
                pickupTime: pickup?.meetingTime || "07.30 a.m.",
                departDate: `${new Date(`${booking.travel_date}T00:00:00`).toLocaleDateString("en-GB")} (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${booking.travel_date}T00:00:00`).getDay()]})`,
                adultCount: adultCount || 1,
                adultPrice: Number(tour?.price) || 3900,
                adultAmount: (adultCount || 1) * (Number(tour?.price) || 3900),
                childCount: childCount > 0 ? childCount : undefined,
                childPrice: childCount > 0 ? Number(tour?.child_price) || 0 : undefined,
                childAmount: childCount > 0 ? childCount * (Number(tour?.child_price) || 0) : undefined,
                paymentMethod: payment?.payment_method?.includes("card")
                  ? "CREDIT"
                  : payment?.payment_method?.includes("cash")
                  ? "CASH"
                  : "OTHER",
                feePercent: payment?.payment_method?.includes("card") ? 4 : undefined,
                feeAmount: payment?.payment_method?.includes("card")
                  ? Math.round(
                      ((adultCount || 1) * (Number(tour?.price) || 3900) +
                        (childCount || 0) * (Number(tour?.child_price) || 0)) *
                        0.04
                    )
                  : undefined,
                totalAmount:
                  payment?.amount ||
                  (adultCount || 1) * (Number(tour?.price) || 3900) +
                    (childCount || 0) * (Number(tour?.child_price) || 0),
                remark:
                  pickup?.pickupNotes ||
                  guestDetails
                    .map((g) =>
                      [
                        g.dietary_requirements?.join(", "),
                        g.allergies?.join(", "),
                        g.other_requests,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    )
                    .filter(Boolean)
                    .join(" | ") ||
                  "Non-refundable once tour commences.",
                issuedBy: voucherIssuedBy,
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

