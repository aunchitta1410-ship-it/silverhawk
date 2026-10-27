"use client";

import { useState, useMemo } from "react";
import type { AuditLogEntry } from "@/lib/audit-log";

type Props = {
  initialLogs: AuditLogEntry[];
  locale: string;
};

export default function AuditLogClient({ initialLogs }: Props) {
  const [logs] = useState<AuditLogEntry[]>(initialLogs);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const actionColors: Record<string, string> = {
    APPROVE_BOOKING: "bg-green-100 text-green-800 border-green-200",
    CANCEL_BOOKING: "bg-red-100 text-red-800 border-red-200",
    EDIT_BOOKING: "bg-blue-100 text-blue-800 border-blue-200",
    REJECT_BOOKING: "bg-red-100 text-red-800 border-red-200",
    UPDATE_TOUR: "bg-purple-100 text-purple-800 border-purple-200",
    UPDATE_PICKUP: "bg-amber-100 text-amber-800 border-amber-200",
    PAYMENT_RECORDED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    VERIFY_PAYMENT_SLIP: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECT_PAYMENT_SLIP: "bg-rose-100 text-rose-800 border-rose-200",
    ADMIN_LOGIN: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = filterAction === "all" || log.action === filterAction;
      const matchesSearch =
        log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(log.targetId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesAction && matchesSearch;
    });
  }, [logs, filterAction, searchTerm]);

  // Aggregate metrics
  const totalLogs = logs.length;
  const approvals = logs.filter((l) => l.action === "APPROVE_BOOKING").length;
  const cancellations = logs.filter((l) => l.action === "CANCEL_BOOKING").length;
  const edits = logs.filter((l) => l.action === "EDIT_BOOKING" || l.action === "UPDATE_TOUR").length;

  return (
    <div className="p-6 md:p-8 text-[#282722]">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[#B89450] font-bold">
          Security & Compliance
        </p>
        <h1 className="text-2xl font-bold text-[#17352A] sm:text-3xl mt-1">
          Admin Audit Logs
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Immutable audit trail of administrator actions, status changes, and record updates.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Audit Events</span>
          <p className="mt-2 text-2xl font-bold text-[#17352A]">
            {totalLogs.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Approvals</span>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {approvals.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Cancellations</span>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {cancellations.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Edits & Updates</span>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {edits.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D6CEBD] bg-white p-4 shadow-xs">
        <div className="flex-1 min-w-[260px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by admin email, target ID, action or details..."
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#B89450]"
          />
        </div>

        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#B89450]"
          >
            <option value="all">All Actions</option>
            <option value="APPROVE_BOOKING">Approve Booking</option>
            <option value="CANCEL_BOOKING">Cancel Booking</option>
            <option value="EDIT_BOOKING">Edit Booking</option>
            <option value="UPDATE_TOUR">Update Tour</option>
            <option value="UPDATE_PICKUP">Update Pick-up</option>
            <option value="PAYMENT_RECORDED">Payment Recorded</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-[#D6CEBD] bg-white overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No audit logs recorded yet. Any admin actions (approving bookings, editing details, saving tours) will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F3] border-b border-[#D6CEBD] text-gray-600 font-bold">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Admin User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF8F3]/50 transition">
                    <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#17352A]">
                      {log.adminEmail}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          actionColors[log.action] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {log.action.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-800 whitespace-nowrap">
                      {log.targetType.toUpperCase()} #{log.targetId}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 max-w-md">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

