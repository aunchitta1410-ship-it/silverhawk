"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type CustomerBooking = {
  id: number;
  booking_code: string | null;
  tour_id: number;
  tour_title?: string;
  travel_date: string;
  status: string;
  guests: number;
  created_at: string;
};

export type CustomerSummary = {
  email: string;
  name: string;
  phone: string;
  nationality: string;
  totalBookings: number;
  totalSpent: number;
  latestBookingDate: string;
  pdpaAcknowledged: boolean;
  pdpaDate?: string;
  privacyVersion?: string;
  bookings: CustomerBooking[];
};

type Props = {
  customers: CustomerSummary[];
  locale: string;
};

export default function CustomerDatabaseClient({ customers, locale }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNationality, setSelectedNationality] = useState("all");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Extract unique nationalities
  const nationalities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.nationality && c.nationality !== "—") set.add(c.nationality);
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.bookings.some((b) =>
          (b.booking_code || "").toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesNationality =
        selectedNationality === "all" || c.nationality === selectedNationality;

      return matchesSearch && matchesNationality;
    });
  }, [customers, searchTerm, selectedNationality]);

  // Summary metrics
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.totalBookings > 1).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    paid: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 md:p-8 text-[#282722]">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[#B89450] font-bold">
          Admin Management
        </p>
        <h1 className="text-2xl font-bold text-[#17352A] sm:text-3xl mt-1">
          Customer Database
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Comprehensive customer profiles, contact records, and booking history.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Customers</span>
            <span className="h-2 w-2 rounded-full bg-[#17352A]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[#17352A]">
            {totalCustomers.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Repeat Travelers</span>
            <span className="h-2 w-2 rounded-full bg-[#B89450]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[#B89450]">
            {repeatCustomers.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            {totalCustomers > 0 ? `${Math.round((repeatCustomers / totalCustomers) * 100)}% of customer base` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Customer Spend</span>
            <span className="h-2 w-2 rounded-full bg-[#D1B16A]" />
          </div>
          <p className="mt-2 text-3xl font-bold text-[#17352A]">
            ฿{totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D6CEBD] bg-white p-4 shadow-xs">
        <div className="flex-1 min-w-[260px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or booking code..."
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs outline-none focus:border-[#B89450]"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedNationality}
            onChange={(e) => setSelectedNationality(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#B89450]"
          >
            <option value="all">All Nationalities</option>
            {nationalities.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer List */}
      <div className="rounded-2xl border border-[#D6CEBD] bg-white overflow-hidden shadow-xs">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No customers found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCustomers.map((cust) => {
              const isExpanded = expandedEmail === cust.email;
              const initials = cust.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "C";

              return (
                <div key={cust.email} className="transition hover:bg-[#FAF8F3]/50">
                  <div
                    onClick={() => setExpandedEmail(isExpanded ? null : cust.email)}
                    className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-[240px]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#17352A] text-xs font-bold text-[#D1B16A]">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#17352A]">
                          {cust.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {cust.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium text-gray-800">{cust.phone || "—"}</p>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <p className="text-gray-500">Nationality</p>
                      <p className="font-medium text-gray-800">{cust.nationality || "—"}</p>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <p className="text-gray-500">PDPA Status</p>
                      {cust.pdpaAcknowledged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <span>✓</span> Consented
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[10px]">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-0.5">
                      <p className="text-gray-500">Bookings</p>
                      <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-bold text-amber-800">
                        {cust.totalBookings} {cust.totalBookings === 1 ? "Trip" : "Trips"}
                      </span>
                    </div>

                    <div className="text-xs space-y-0.5">
                      <p className="text-gray-500">Total Spend</p>
                      <p className="font-bold text-[#B89450] text-sm font-mono">
                        ฿{cust.totalSpent.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        className="rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs font-semibold text-[#17352A] hover:border-[#B89450]"
                      >
                        {isExpanded ? "▲ Hide History" : "▼ Booking History"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Booking History */}
                  {isExpanded && (
                    <div className="bg-[#FAF8F3] p-5 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-[#17352A] uppercase tracking-wider mb-3">
                        Travel History ({cust.bookings.length} Bookings)
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {cust.bookings.map((b) => (
                          <div
                            key={b.id}
                            className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-xs font-bold text-[#17352A]">
                                {b.booking_code || `BK-${b.id}`}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                  statusColors[b.status] || "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {b.status}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {b.tour_title || `Tour #${b.tour_id}`}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                              <span>{b.travel_date}</span>
                              <span>{b.guests} Guests</span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">
                                {new Date(b.created_at).toLocaleDateString()}
                              </span>
                              <Link
                                href={`/${locale}/admin/bookings/${b.id}`}
                                className="text-xs font-bold text-[#B89450] hover:underline"
                              >
                                View Booking →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

