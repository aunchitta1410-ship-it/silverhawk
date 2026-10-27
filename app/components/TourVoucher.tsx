"use client";

import React, { useRef } from "react";

export type TourVoucherData = {
  voucherNo: string;
  issueDate: string; // e.g. "13/02/2026"
  tourService: string; // e.g. "Game Fishing Trolling & Spinning"
  company: string; // e.g. "Nikorn Marine" or "Silver Hawk"
  guestName: string; // e.g. "IAN HEDLEY"
  hotel: string; // e.g. "Andaman Cannacia"
  roomNo: string; // e.g. "217"
  pickupTime: string; // e.g. "07.30 a.m."
  departDate: string; // e.g. "18/02/2026 (Wed)"
  adultCount: number;
  adultPrice: number;
  adultAmount: number;
  childCount?: number;
  childPrice?: number;
  childAmount?: number;
  paymentMethod: "CASH" | "CREDIT" | "OTHER";
  feePercent?: number; // e.g. 4
  feeAmount?: number; // e.g. 312
  totalAmount: number; // e.g. 8112
  remark?: string;
  issuedBy?: string; // e.g. "Pin"
};

type Props = {
  data: TourVoucherData;
  showPrintButton?: boolean;
};

export default function TourVoucher({ data, showPrintButton = true }: Props) {
  const voucherRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isCash = data.paymentMethod === "CASH";
  const isCredit = data.paymentMethod === "CREDIT";
  const isOther = data.paymentMethod === "OTHER";

  return (
    <div className="w-full max-w-3xl mx-auto my-6 print:m-0 print:p-0 print:w-full print:max-w-full">
      {/* Action buttons (hidden on print) */}
      {showPrintButton && (
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-800">
              Official Tour Voucher Generated
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-[#17352A] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0e251c] transition-all cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Print Tour Voucher</span>
          </button>
        </div>
      )}

      {/* The Voucher Card (Styled to match the physical paper layout) */}
      <div
        ref={voucherRef}
        id="tour-voucher-printable"
        className="voucher-container relative bg-[#F7FAFC] border-2 border-[#CBD5E1] rounded-lg p-6 sm:p-8 text-[#1E293B] shadow-lg print:shadow-none print:border print:m-0 print:p-6 print:w-full print:max-w-full print:bg-white"
        style={{
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* HEADER SECTION */}
        <div className="flex items-start justify-between border-b-2 border-[#94A3B8]/60 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E40AF] tracking-wide">
              Silver Hawk / ซิลเวอร์ ฮอร์ค
            </h1>
            <p className="text-[11px] sm:text-xs text-[#334155] font-medium mt-0.5 leading-snug">
              35/109 M.3, T.Vichit, A.Muang, Phuket 83000 Tel : 063-6064199, 063-5959421
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs sm:text-sm font-bold tracking-widest text-[#334155] uppercase">
              VOUCHER
            </p>
            <p className="text-base sm:text-lg font-black text-[#B91C1C] font-mono tracking-wider mt-0.5">
              № <span className="border-b border-dotted border-[#B91C1C] pb-0.5">{data.voucherNo}</span>
            </p>
          </div>
        </div>

        {/* PAID BADGE & TOUR VOUCHER TITLE */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Red Rubber Stamp Effect */}
            <div className="inline-block border-3 border-[#DC2626] rounded px-3 py-0.5 transform -rotate-1 font-black text-xl sm:text-2xl text-[#DC2626] tracking-widest uppercase shadow-xs">
              PAID
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-wider text-[#1E293B] uppercase">
              TOUR VOUCHER
            </span>
          </div>

          <div className="text-xs sm:text-sm font-semibold text-[#334155]">
            Date : <span className="font-mono font-bold border-b border-dotted border-gray-600 px-2">{data.issueDate}</span>
          </div>
        </div>

        {/* VOUCHER DETAILS TABLE */}
        <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
          {/* Row 1: Tour Service & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-baseline">
            <div className="sm:col-span-8 flex items-baseline gap-1.5">
              <span className="font-bold whitespace-nowrap text-[#1E293B]">Tour Service :</span>
              <span className="flex-1 font-semibold text-[#0F172A] border-b border-dotted border-gray-500 pb-0.5 px-1 truncate">
                {data.tourService}
              </span>
            </div>
            <div className="sm:col-span-4 flex items-baseline gap-1.5">
              <span className="font-bold whitespace-nowrap text-[#1E293B]">Company :</span>
              <span className="flex-1 font-semibold text-[#0F172A] border-b border-dotted border-gray-500 pb-0.5 px-1 truncate">
                {data.company || "Silver Hawk"}
              </span>
            </div>
          </div>

          {/* Row 2: Guest Name */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold whitespace-nowrap text-[#1E293B]">Guest Name :</span>
            <span className="flex-1 font-bold text-[#0F172A] uppercase tracking-wide border-b border-dotted border-gray-500 pb-0.5 px-1">
              {data.guestName}
            </span>
          </div>

          {/* Row 3: Hotel & Room No */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-baseline">
            <div className="sm:col-span-8 flex items-baseline gap-1.5">
              <span className="font-bold whitespace-nowrap text-[#1E293B]">Hotel :</span>
              <span className="flex-1 font-semibold text-[#0F172A] border-b border-dotted border-gray-500 pb-0.5 px-1 truncate">
                {data.hotel || "—"}
              </span>
            </div>
            <div className="sm:col-span-4 flex items-baseline gap-1.5">
              <span className="font-bold whitespace-nowrap text-[#1E293B]">Room No. :</span>
              <span className="flex-1 font-semibold text-[#0F172A] border-b border-dotted border-gray-500 pb-0.5 px-1">
                {data.roomNo || "—"}
              </span>
            </div>
          </div>

          {/* Row 4: Pick Up Time & Depart Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-baseline">
            <div className="sm:col-span-6 flex items-baseline gap-1.5">
              <span className="font-bold whitespace-nowrap text-[#1E293B]">Pick Up Time :</span>
              <span className="flex-1 font-semibold text-[#0F172A] border-b border-dotted border-gray-500 pb-0.5 px-1">
                {data.pickupTime || "08.00 a.m."}
              </span>
            </div>
            <div className="sm:col-span-6 flex items-baseline gap-1.5">
              <span className="font-bold whitespace-nowrap text-[#1E293B]">Depart Date :</span>
              <span className="flex-1 font-semibold text-[#0F172A] border-b border-dotted border-gray-500 pb-0.5 px-1">
                {data.departDate}
              </span>
            </div>
          </div>

          {/* Row 5: Adults */}
          <div className="grid grid-cols-12 gap-1.5 items-baseline">
            <div className="col-span-3 sm:col-span-2 flex items-baseline gap-1">
              <span className="font-bold text-[#1E293B]">Adult :</span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-2 flex-1 text-center">
                {data.adultCount}
              </span>
            </div>
            <div className="col-span-4 sm:col-span-5 flex items-baseline gap-1">
              <span className="font-bold text-[#1E293B]">Price</span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-1 flex-1 text-center">
                {data.adultPrice.toLocaleString()}
              </span>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">Pax./THB.</span>
            </div>
            <div className="col-span-5 sm:col-span-5 flex items-baseline gap-1 justify-end">
              <span className="font-bold text-[#1E293B]">Amount</span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-2 flex-1 text-right">
                {data.adultAmount.toLocaleString()}
              </span>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">Baht</span>
            </div>
          </div>

          {/* Row 6: Children */}
          <div className="grid grid-cols-12 gap-1.5 items-baseline">
            <div className="col-span-3 sm:col-span-2 flex items-baseline gap-1">
              <span className="font-bold text-[#1E293B]">Child :</span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-2 flex-1 text-center">
                {data.childCount && data.childCount > 0 ? data.childCount : ""}
              </span>
            </div>
            <div className="col-span-4 sm:col-span-5 flex items-baseline gap-1">
              <span className="font-bold text-[#1E293B]">Price</span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-1 flex-1 text-center">
                {data.childPrice && data.childPrice > 0 ? data.childPrice.toLocaleString() : ""}
              </span>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">Pax./THB.</span>
            </div>
            <div className="col-span-5 sm:col-span-5 flex items-baseline gap-1 justify-end">
              <span className="font-bold text-[#1E293B]">Amount</span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-2 flex-1 text-right">
                {data.childAmount && data.childAmount > 0 ? data.childAmount.toLocaleString() : ""}
              </span>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">Baht</span>
            </div>
          </div>

          {/* Row 7: Payment Options & Fee */}
          <div className="pt-2 border-t border-gray-300 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            <div className="sm:col-span-7 flex items-center gap-4 text-xs font-bold">
              <label className="inline-flex items-center gap-1.5 cursor-default">
                <span className={`inline-block w-4 h-4 rounded-full border-2 border-gray-700 flex items-center justify-center text-[10px] ${isCash ? "bg-gray-800 text-white font-bold" : ""}`}>
                  {isCash ? "✓" : ""}
                </span>
                <span>CASH</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-default">
                <span className={`inline-block w-4 h-4 rounded-full border-2 border-gray-700 flex items-center justify-center text-[10px] ${isCredit ? "bg-gray-800 text-white font-bold" : ""}`}>
                  {isCredit ? "✓" : ""}
                </span>
                <span>CREDIT</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-default">
                <span className={`inline-block w-4 h-4 rounded-full border-2 border-gray-700 flex items-center justify-center text-[10px] ${isOther ? "bg-gray-800 text-white font-bold" : ""}`}>
                  {isOther ? "✓" : ""}
                </span>
                <span>OTHER</span>
              </label>
            </div>

            <div className="sm:col-span-5 flex items-baseline justify-end gap-1.5 text-xs">
              <span className="font-bold text-[#1E293B]">FEE</span>
              <span className="font-semibold text-gray-700">
                {data.feePercent ? `${data.feePercent}%` : "—"}
              </span>
              <span className="font-mono font-bold border-b border-dotted border-gray-500 px-2 text-right min-w-[60px]">
                {data.feeAmount && data.feeAmount > 0 ? data.feeAmount.toLocaleString() : "—"}
              </span>
            </div>
          </div>

          {/* Row 8: Total Amount */}
          <div className="flex justify-end items-baseline gap-2 pt-1">
            <span className="text-sm font-black text-[#1E293B]">Total Amount</span>
            <span className="text-base sm:text-lg font-black font-mono border-b-2 border-gray-800 px-3 text-right text-[#0F172A]">
              {data.totalAmount.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#1E293B]">Baht</span>
          </div>

          {/* Row 9: Remark */}
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="font-bold whitespace-nowrap text-[#1E293B]">Remark :</span>
            <span className="flex-1 font-medium text-xs text-[#334155] border-b border-dotted border-gray-500 pb-0.5 px-1 truncate">
              {data.remark || "—"}
            </span>
          </div>
        </div>

        {/* BOTTOM SECTION: TWO SIGNATURE / ISSUE BOXES */}
        <div className="mt-6 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left Box: Issued By */}
          <div className="flex flex-col">
            <div className="border border-gray-400 bg-white/70 p-3 rounded text-xs space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="font-semibold text-gray-700">Issued By</span>
                <span className="flex-1 font-bold text-center border-b border-dotted border-gray-500 px-2">
                  {data.issuedBy || "Pin"}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-semibold text-gray-700">Date</span>
                <span className="flex-1 font-mono font-bold text-center border-b border-dotted border-gray-500 px-2">
                  {data.issueDate}
                </span>
              </div>
            </div>
            <p className="mt-1 font-bold text-sm text-[#1E40AF] tracking-wide">
              Silver Hawk
            </p>
          </div>

          {/* Right Box: Guest Signature */}
          <div className="border border-gray-400 bg-white/70 p-3 rounded text-xs flex flex-col justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-gray-700 whitespace-nowrap">Guest Signature</span>
              <div className="flex-1 border-b border-dotted border-gray-600 h-5" />
            </div>
            <p className="mt-3 text-center text-[11px] font-bold text-[#B91C1C]">
              (Booking is Non Refundable)
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS to guarantee clean printable page with Legal Landscape, 120% scale, 1-page fit */}
      <style>{`
        @page {
          size: legal landscape;
          margin: 10mm;
        }

        @media print {
          html, body {
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          #tour-voucher-printable,
          #tour-voucher-printable * {
            visibility: visible;
          }

          #tour-voucher-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
            color: black !important;
            zoom: 1.2 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          header,
          footer,
          nav,
          button,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
