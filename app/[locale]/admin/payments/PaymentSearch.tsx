
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

type Payment = {
  id: number;
  booking_id: number;
  booking_code: string | null;
  status: string;
  payment_method: string | null;
  amount: number | string | null;
  paid_at: string | null;
  created_at: string;
};

type Props = {
  payments: Payment[];
};

export default function PaymentSearch({ payments }: Props) {
  const router = useRouter();
  const [paymentList, setPaymentList] = useState<Payment[]>(payments);

  useEffect(() => {
    setPaymentList(payments);
  }, [payments]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Receipt Modal state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [receiptData, setReceiptData] = useState<{
    slip_url: string;
    uploaded_at: string;
    customer_name?: string;
  } | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const locale = useLocale();

  const handleOpenReceiptModal = async (payment: Payment) => {
    setSelectedPayment(payment);
    setShowRejectForm(false);
    setRejectReason("");
    setLoadingReceipt(true);
    setReceiptData(null);
    try {
      const res = await fetch(`/api/payments/receipt?booking_id=${payment.booking_id}`);
      const json = await res.json();
      if (json.receipt) {
        setReceiptData(json.receipt);
      } else {
        // Fallback placeholder for demonstration
        setReceiptData({
          slip_url: "/images/promptpay-qr.svg",
          uploaded_at: payment.created_at,
          customer_name: "Customer",
        });
      }
    } catch {
      setReceiptData({
        slip_url: "/images/promptpay-qr.svg",
        uploaded_at: payment.created_at,
      });
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedPayment) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: selectedPayment.booking_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verification failed");

      // Update local state immediately
      setPaymentList((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id || p.booking_id === selectedPayment.booking_id
            ? { ...p, status: "paid" }
            : p
        )
      );

      alert(
        json.message ||
          "Payment verified and confirmed successfully! Official Tour Voucher sent to customer's email."
      );
      setSelectedPayment(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejecting the receipt.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedPayment.booking_id,
          action: "reject",
          rejectReason: rejectReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rejection failed");

      // Update local state immediately
      setPaymentList((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id || p.booking_id === selectedPayment.booking_id
            ? { ...p, status: "rejected" }
            : p
        )
      );

      alert(
        json.message ||
          "Payment receipt rejected. Notification email sent to customer with instructions to re-submit."
      );
      setSelectedPayment(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return paymentList.filter((payment) => {
      const searchText = search.toLowerCase().trim();

      const displayBookingId =
        payment.booking_code || `BK-${payment.booking_id}`;

      const matchesSearch =
        String(payment.id).includes(searchText) ||
        String(payment.booking_id).includes(searchText) ||
        displayBookingId.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending_review" &&
          (payment.status?.toLowerCase().includes("pending") ||
            payment.status?.toLowerCase() === "pending_verification")) ||
        (statusFilter === "paid" &&
          (payment.status?.toLowerCase() === "paid" ||
            payment.status?.toLowerCase() === "confirmed")) ||
        (statusFilter === "rejected" &&
          (payment.status?.toLowerCase() === "rejected" ||
            payment.status?.toLowerCase() === "cancelled")) ||
        payment.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesMethod =
        methodFilter === "all" ||
        payment.payment_method?.toLowerCase() ===
          methodFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod
      );
    });
  }, [paymentList, search, statusFilter, methodFilter]);

  const pendingCount = useMemo(() => {
    return paymentList.filter(
      (p) =>
        p.status?.toLowerCase().includes("pending") ||
        p.status?.toLowerCase() === "pending_verification" ||
        p.status?.toLowerCase() === "pending_review"
    ).length;
  }, [paymentList]);

  const paidCount = useMemo(() => {
    return paymentList.filter(
      (p) => p.status?.toLowerCase() === "paid" || p.status?.toLowerCase() === "confirmed"
    ).length;
  }, [paymentList]);

  const rejectedCount = useMemo(() => {
    return paymentList.filter(
      (p) => p.status?.toLowerCase() === "rejected" || p.status?.toLowerCase() === "cancelled"
    ).length;
  }, [paymentList]);

  return (
    <div>
      {/* Quick Status Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-[#17352A] text-[#D1B16A] shadow-xs"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span>All Payments</span>
          <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] font-mono">
            {payments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("pending_review")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            statusFilter === "pending_review"
              ? "bg-amber-600 text-white shadow-xs"
              : "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
        >
          <span>⏳ Pending Review (Slip Uploaded)</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              statusFilter === "pending_review" ? "bg-white text-amber-800" : "bg-amber-200 text-amber-900"
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("paid")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            statusFilter === "paid"
              ? "bg-emerald-700 text-white shadow-xs"
              : "border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
          }`}
        >
          <span>✓ Paid &amp; Approved</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              statusFilter === "paid" ? "bg-white text-emerald-800" : "bg-emerald-200 text-emerald-900"
            }`}
          >
            {paidCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
            statusFilter === "rejected"
              ? "bg-red-700 text-white shadow-xs"
              : "border border-red-200 bg-red-50 text-red-900 hover:bg-red-100"
          }`}
        >
          <span>✕ Rejected</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              statusFilter === "rejected" ? "bg-white text-red-800" : "bg-red-200 text-red-900"
            }`}
          >
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search */}
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>

            <input
              type="text"
              placeholder="Search Payment ID or Booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#17352A]"
            />
          </div>

          {/* Payment Status */}
          <div className="w-full md:w-60">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payment Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
            >
              <option value="all">All Status ({payments.length})</option>
              <option value="pending_review">⏳ Pending Review ({pendingCount})</option>
              <option value="paid">✓ Paid &amp; Approved ({paidCount})</option>
              <option value="rejected">✕ Rejected ({rejectedCount})</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="w-full md:w-48">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Payment Method
            </label>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
            >
              <option value="all">All Methods</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="qr_payment">QR Payment</option>
            </select>
          </div>
        </div>

        {/* Result Count */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredPayments.length} of {payments.length} payments
        </div>
      </div>

      {/* Payment Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4">Payment ID</th>
              <th className="p-4">Booking ID</th>
              <th className="p-4">Status</th>
              <th className="p-4">Method</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Paid At</th>
              <th className="p-4">Receipt & Verification</th>
            </tr>
          </thead>

          <tbody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-t hover:bg-gray-50"
                >
                  {/* Payment ID */}
                  <td className="p-4">
                    <Link
                      href={`/${locale}/admin/payments/${payment.id}`}
                      className="font-medium text-[#17352A] hover:underline"
                    >
                      {payment.id}
                    </Link>
                  </td>

                  {/* Booking ID */}
                  <td className="p-4">
                    <Link
                      href={`/${locale}/admin/bookings/${payment.booking_id}`}
                      className="font-medium text-[#17352A] hover:underline"
                    >
                      {payment.booking_code ||
                        `BK-${payment.booking_id}`}
                    </Link>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        payment.status === "paid" || payment.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : payment.status === "cancelled" || payment.status === "rejected" || payment.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {payment.status === "paid" || payment.status === "confirmed" ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          <span>Paid (Verified)</span>
                        </>
                      ) : payment.status === "pending" ||
                        payment.status === "pending_verification" ||
                        payment.status === "pending_review" ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                          <span>Slip Uploaded (Review Needed)</span>
                        </>
                      ) : (
                        <span>{payment.status}</span>
                      )}
                    </span>
                  </td>

                  {/* Method */}
                  <td className="p-4">
                    <span className="font-medium capitalize text-xs">
                      {payment.payment_method?.replace(/_/g, " ") || "-"}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="p-4 font-bold text-[#B89450]">
                    ฿{Number(payment.amount || 0).toLocaleString()}
                  </td>

                  {/* Paid At */}
                  <td className="p-4 text-xs text-gray-500">
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleString()
                      : "Pending Verification"}
                  </td>

                  {/* Receipt & Verification */}
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleOpenReceiptModal(payment)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#B89450] bg-[#FAF8F3] px-3 py-1.5 text-xs font-semibold text-[#17352A] hover:bg-[#B89450] hover:text-white transition shadow-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Review Slip
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-gray-500"
                >
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Payment Slip Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Transaction Receipt Verification & Reconciliation
                </h3>
                <p className="text-xs text-gray-500">
                  Payment #{selectedPayment.id} • Booking #{selectedPayment.booking_code || selectedPayment.booking_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {loadingReceipt ? (
              <div className="p-8 text-center text-xs text-gray-500">
                Loading uploaded transaction receipt...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-3 text-xs">
                  <div>
                    <span className="text-gray-500">Amount Due / Paid:</span>
                    <p className="font-bold text-sm text-[#B89450]">
                      ฿{Number(selectedPayment.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Method:</span>
                    <p className="font-semibold text-gray-900 capitalize">
                      {selectedPayment.payment_method?.replace(/_/g, " ") || "PromptPay QR"}
                    </p>
                  </div>
                </div>

                {/* Slip Viewer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Uploaded Transfer Slip / Proof of Payment:
                    </label>
                    {receiptData?.slip_url && (
                      <a
                        href={receiptData.slip_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-[#B89450] hover:underline"
                      >
                        Open full image ↗
                      </a>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-black/5 p-2 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptData?.slip_url || "/images/promptpay-qr.svg"}
                      alt="Payment Transfer Slip"
                      className="max-h-56 object-contain rounded-lg shadow-sm"
                    />
                  </div>
                </div>

                {/* Rejection Form Drawer / Box */}
                {showRejectForm ? (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-800">
                        Specify Rejection Reason (Emailed to Customer)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Quick reason chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Amount mismatch (transferred amount does not match total)",
                        "Illegible receipt / blurry image uploaded",
                        "Transferred to incorrect bank account",
                        "Duplicate receipt / slip already used",
                        "Payment slip date does not match booking",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setRejectReason(chip)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                            rejectReason === chip
                              ? "border-red-600 bg-red-600 text-white font-semibold"
                              : "border-red-200 bg-white text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain to the customer why the receipt cannot be accepted and provide instructions to re-submit..."
                      className="w-full rounded-lg border border-red-200 bg-white p-2.5 text-xs text-gray-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => setShowRejectForm(false)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={isVerifying || !rejectReason.trim()}
                        onClick={handleRejectPayment}
                        className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        {isVerifying ? "Rejecting & Sending Email..." : "Confirm Rejection & Email Customer"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#FAF8F3] border border-[#B89450]/20 p-3 text-[11px] text-gray-600 leading-relaxed">
                    <p className="font-semibold text-[#17352A] mb-0.5">Automated Reconciliation:</p>
                    <p>• <strong>Approve:</strong> Confirms booking as Paid and automatically generates & emails the official Tour Voucher to the customer.</p>
                    <p>• <strong>Reject:</strong> Sends an official notification email with your rejection reason and direct re-upload instructions.</p>
                  </div>
                )}

                {/* Footer Buttons */}
                {!showRejectForm && (
                  <div className="flex justify-between items-center pt-3 border-t">
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => setShowRejectForm(true)}
                      className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition"
                    >
                      Reject Receipt...
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(null)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={handleVerifyPayment}
                        className="rounded-lg bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-5 py-2 text-xs font-bold text-[#282722] shadow-sm hover:brightness-105 transition"
                      >
                        {isVerifying ? "Verifying & Sending Voucher..." : "Approve & Email Voucher"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
