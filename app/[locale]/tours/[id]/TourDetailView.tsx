"use client";

import { useState } from "react";
import Link from "next/link";
import { AdultIcon, ChildIcon, InfantIcon } from "@/app/components/PassengerIcons";
import {
  type TourExtendedData,
  type PricingModel,
  getRuleItemText,
  DEFAULT_NOT_RECOMMENDED_LOCALIZED,
  DEFAULT_INCLUDES_LOCALIZED,
  DEFAULT_EXCLUDES_LOCALIZED,
  DEFAULT_WHAT_TO_BRING_LOCALIZED,
  DEFAULT_COOKING_CLASS,
  DEFAULT_ACTIVITY_ATV,
  DEFAULT_TRANSFER_ROUTES,
} from "@/lib/tour-extended-types";
import { getTourDisplayCode } from "@/lib/tour-code";

export type TourData = {
  id: number;
  title_en: string;
  title_zh?: string | null;
  title_th?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
  description_th?: string | null;
  operated_days?: string | null;
  price?: number | null;
  child_price?: number | null;
  infant_price?: number | null;
  child_age_min?: number | null;
  child_age_max?: number | null;
  infant_age_min?: number | null;
  infant_age_max?: number | null;
  tour_type?: string | null;
  destination?: string | null;
  duration?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  important_info_en?: string | null;
  important_info_zh?: string | null;
  important_info_th?: string | null;
};

import type { SitePolicies, TourType } from "@/lib/site-policies-base";
import {
  DEFAULT_TOUR_TYPE_PDPA,
  DEFAULT_TOUR_TYPE_CANCELLATION,
} from "@/lib/site-policies-base";

export type ItineraryItem = {
  id: number;
  time: string;
  activity_en?: string | null;
  activity_zh?: string | null;
  activity_th?: string | null;
  image_signed_url?: string | null;
};

export type IncludeItem = {
  id: number;
  item_en?: string | null;
  item_zh?: string | null;
  item_th?: string | null;
};

type Props = {
  tour: TourData;
  itinerary: ItineraryItem[];
  includes: IncludeItem[];
  galleryImages: string[];
  extendedData?: TourExtendedData;
  sitePolicies?: SitePolicies;
  locale: string;
  title: string;
  description: string;
};

export default function TourDetailView({
  tour,
  itinerary,
  includes,
  galleryImages,
  extendedData,
  sitePolicies,
  locale,
  title,
  description,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "itinerary" | "includes" | "policy">("overview");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isPdpaModalOpen, setIsPdpaModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isThai = locale === "th";
  const isChinese = locale === "zh";

  const displayImages = galleryImages.length > 0 ? galleryImages : ["/images/default-tour.jpg"];
  const activeImage = displayImages[selectedImageIndex] || displayImages[0];

  const effectiveTourType = (extendedData?.tour_type || tour.tour_type || "Tour Package") as TourType;
  const chargesExtraPickup = extendedData?.charges_extra_pickup_fee ?? false;

  // Dynamic Tour-Type Specific PDPA with Product Overrides
  const effectivePdpa = (() => {
    const defaultPdpa =
      sitePolicies?.pdpa?.by_tour_type?.[effectiveTourType] ||
      DEFAULT_TOUR_TYPE_PDPA[effectiveTourType] ||
      DEFAULT_TOUR_TYPE_PDPA["Tour Package"];
    if (extendedData?.custom_pdpa_policy?.override) {
      return {
        ...defaultPdpa,
        required_info_en: extendedData.custom_pdpa_policy.required_info_en || defaultPdpa.required_info_en,
        required_info_th: extendedData.custom_pdpa_policy.required_info_th || defaultPdpa.required_info_th,
        required_info_zh: extendedData.custom_pdpa_policy.required_info_zh || defaultPdpa.required_info_zh,
        purpose_en: extendedData.custom_pdpa_policy.purpose_en || defaultPdpa.purpose_en,
        purpose_th: extendedData.custom_pdpa_policy.purpose_th || defaultPdpa.purpose_th,
        purpose_zh: extendedData.custom_pdpa_policy.purpose_zh || defaultPdpa.purpose_zh,
        additional_disclosures_en: extendedData.custom_pdpa_policy.additional_disclosures_en || defaultPdpa.additional_disclosures_en,
        additional_disclosures_th: extendedData.custom_pdpa_policy.additional_disclosures_th || defaultPdpa.additional_disclosures_th,
        additional_disclosures_zh: extendedData.custom_pdpa_policy.additional_disclosures_zh || defaultPdpa.additional_disclosures_zh,
      };
    }
    return defaultPdpa;
  })();

  // Dynamic Tour-Type Specific Cancellation Terms with Product Overrides
  const effectiveCancellation = (() => {
    const defaultCancel =
      sitePolicies?.cancellation?.by_tour_type?.[effectiveTourType] ||
      DEFAULT_TOUR_TYPE_CANCELLATION[effectiveTourType] ||
      DEFAULT_TOUR_TYPE_CANCELLATION["Tour Package"];
    if (extendedData?.custom_cancellation_policy?.override) {
      return {
        ...defaultCancel,
        summary_en: extendedData.custom_cancellation_policy.summary_en || defaultCancel.summary_en,
        summary_th: extendedData.custom_cancellation_policy.summary_th || defaultCancel.summary_th,
        summary_zh: extendedData.custom_cancellation_policy.summary_zh || defaultCancel.summary_zh,
        refund_conditions_en: extendedData.custom_cancellation_policy.refund_conditions_en || defaultCancel.refund_conditions_en,
        refund_conditions_th: extendedData.custom_cancellation_policy.refund_conditions_th || defaultCancel.refund_conditions_th,
        refund_conditions_zh: extendedData.custom_cancellation_policy.refund_conditions_zh || defaultCancel.refund_conditions_zh,
        reschedule_policy_en: extendedData.custom_cancellation_policy.reschedule_policy_en || defaultCancel.reschedule_policy_en,
        reschedule_policy_th: extendedData.custom_cancellation_policy.reschedule_policy_th || defaultCancel.reschedule_policy_th,
        reschedule_policy_zh: extendedData.custom_cancellation_policy.reschedule_policy_zh || defaultCancel.reschedule_policy_zh,
        weather_or_noshow_clause_en: extendedData.custom_cancellation_policy.weather_or_noshow_clause_en || defaultCancel.weather_or_noshow_clause_en,
        weather_or_noshow_clause_th: extendedData.custom_cancellation_policy.weather_or_noshow_clause_th || defaultCancel.weather_or_noshow_clause_th,
        weather_or_noshow_clause_zh: extendedData.custom_cancellation_policy.weather_or_noshow_clause_zh || defaultCancel.weather_or_noshow_clause_zh,
      };
    }
    return defaultCancel;
  })();

  const notRecommendedList = (
    extendedData?.not_recommended && extendedData.not_recommended.length > 0
      ? extendedData.not_recommended
      : DEFAULT_NOT_RECOMMENDED_LOCALIZED
  )
    .map((item) => getRuleItemText(item, locale))
    .filter(Boolean);

  const includesList = (
    extendedData?.tour_includes && extendedData.tour_includes.length > 0
      ? extendedData.tour_includes
      : includes.length > 0
      ? includes.map((inc) => (isThai ? inc.item_th || inc.item_en : isChinese ? inc.item_zh || inc.item_en : inc.item_en) || "")
      : DEFAULT_INCLUDES_LOCALIZED
  )
    .map((item) => (typeof item === "string" ? getRuleItemText(item, locale) : getRuleItemText(item, locale)))
    .filter(Boolean);

  const excludesList = (
    extendedData?.tour_excludes && extendedData.tour_excludes.length > 0
      ? extendedData.tour_excludes
      : DEFAULT_EXCLUDES_LOCALIZED
  )
    .map((item) => getRuleItemText(item, locale))
    .filter(Boolean);

  const whatToBringList = (
    extendedData?.what_to_bring && extendedData.what_to_bring.length > 0
      ? extendedData.what_to_bring
      : DEFAULT_WHAT_TO_BRING_LOCALIZED
  )
    .map((item) => getRuleItemText(item, locale))
    .filter(Boolean);

  const pricingModel: PricingModel = extendedData?.pricing_model || "standard";
  const cookingDetails = extendedData?.cooking_class_details || DEFAULT_COOKING_CLASS;
  const atvPricing = extendedData?.activity_pricing || DEFAULT_ACTIVITY_ATV;
  const transferRoutes = (extendedData?.transfer_routes && extendedData.transfer_routes.length > 0)
    ? extendedData.transfer_routes
    : DEFAULT_TRANSFER_ROUTES;

  const ctaButtonText = (() => {
    if (pricingModel === "cooking_class") {
      return isChinese ? "立即预订烹饪课程 →" : isThai ? "จองคลาสเรียนทำอาหารนี้ →" : "Book Cooking Class Now →";
    }
    if (pricingModel === "activity_atv") {
      return isChinese ? "选择ATV套餐与场次 →" : isThai ? "เลือกแพ็กเกจและรอบเวลา ATV →" : "Book ATV Package Now →";
    }
    if (pricingModel === "transfer_timetable") {
      return isChinese ? "查看班次并预订快艇 →" : isThai ? "เลือกเส้นทางเรือสปีดโบ๊ท →" : "Book Speedboat Transfer →";
    }
    switch (effectiveTourType) {
      case "Ticket Only":
        return isChinese ? "立即购买门票 →" : isThai ? "ซื้อบัตรผ่านประตูนี้ →" : "Buy Ticket Now →";
      case "Transfer Only":
        return isChinese ? "立即预订接送 →" : isThai ? "จองบริการรับส่ง →" : "Book Transfer Now →";
      case "Private Tour":
        return isChinese ? "预订私人包团 →" : isThai ? "จองทัวร์ส่วนตัว / เหมาลำ →" : "Book Private Tour →";
      case "Activity Only":
        return isChinese ? "立即预订活动 →" : isThai ? "จองกิจกรรมนี้ →" : "Book Activity Now →";
      default:
        return isChinese ? "立即预订 →" : isThai ? "จองทัวร์นี้ →" : "Book This Tour →";
    }
  })();

  const importantInfo = isThai
    ? tour.important_info_th || tour.important_info_en
    : isChinese
    ? tour.important_info_zh || tour.important_info_en
    : tour.important_info_en;

  // Dynamic customizable ticket details / specifications fields
  const ticketFields: { id?: string; label: string; value: string }[] = (() => {
    const list: { id?: string; label: string; value: string }[] = [];
    if (
      extendedData?.ticket_details?.custom_details &&
      extendedData.ticket_details.custom_details.length > 0
    ) {
      extendedData.ticket_details.custom_details.forEach((cf) => {
        const label =
          (isThai ? cf.name_th : isChinese ? cf.name_zh : cf.name_en) ||
          cf.name_en;
        const val =
          (isThai ? cf.value_th : isChinese ? cf.value_zh : cf.value_en) ||
          cf.value_en;
        if (label && val) {
          list.push({ id: cf.id, label, value: val });
        }
      });
      return list;
    }
    // Fallback legacy fixed fields if custom_details not yet populated
    if (extendedData?.ticket_details?.venue_address) {
      list.push({
        label: isThai ? "สถานที่จัดแสดง" : isChinese ? "景点场馆地址" : "Attraction Venue",
        value: extendedData.ticket_details.venue_address,
      });
    }
    if (extendedData?.ticket_details?.redemption_point) {
      list.push({
        label: isThai ? "จุดแลกรับบัตร" : isChinese ? "换票入园处" : "Redemption Point",
        value: extendedData.ticket_details.redemption_point,
      });
    }
    if (extendedData?.ticket_details?.admission_hours) {
      list.push({
        label: isThai ? "เวลาเปิดทำการ" : isChinese ? "营业开放时间" : "Operating Hours",
        value: extendedData.ticket_details.admission_hours,
      });
    }
    if (extendedData?.ticket_details?.validity_notes) {
      list.push({
        label: isThai ? "เงื่อนไขการใช้งาน" : isChinese ? "门票有效期" : "Validity",
        value: extendedData.ticket_details.validity_notes,
      });
    }
    return list;
  })();

  const tabs = [
    {
      id: "overview",
      label: isThai ? "ภาพรวม" : isChinese ? "概览" : "Overview",
    },
    {
      id: "itinerary",
      label: isThai ? "โปรแกรมการเดินทาง" : isChinese ? "行程安排" : "Itinerary",
    },
    {
      id: "includes",
      label: isThai ? "รายการที่รวมอยู่" : isChinese ? "包含项目" : "What's Included",
    },
    {
      id: "policy",
      label: isThai ? "ข้อมูลสำคัญและนโยบาย" : isChinese ? "重要信息与政策" : "Important Info",
    },
  ];

  const tourCode = getTourDisplayCode(tour, extendedData, tour.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
        <Link href={`/${locale}`} className="hover:text-[#B89450]">
          Home
        </Link>
        <span>/</span>
        <Link href={`/${locale}/tours`} className="hover:text-[#B89450]">
          {isThai ? "ทัวร์ทั้งหมด" : isChinese ? "所有旅游" : "Tours"}
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800 truncate max-w-xs">{title}</span>
        <span className="rounded-md bg-[#282722] px-2 py-0.5 text-[10px] font-bold font-mono text-[#D1B16A]">
          {tourCode}
        </span>
      </div>

      {/* Main Grid: Gallery + Sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start mb-12">
        {/* Left: Interactive Multi-Image Gallery */}
        <div>
          {/* Main Selected Image */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-gray-100 shadow-sm border border-[#D6CEBD] group">
            {activeImage && (activeImage.startsWith("http") || activeImage.startsWith("/") || activeImage.startsWith("data:")) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage}
                alt={title}
                onClick={() => setIsLightboxOpen(true)}
                className="h-full w-full object-cover transition-all duration-300 cursor-zoom-in"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-100 text-[#B89450]">
                <svg className="w-16 h-16 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {tour.destination && (
              <span className="absolute left-4 top-4 rounded-full bg-[#17352A]/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#D1B16A] shadow-md backdrop-blur-xs">
                {tour.destination}
              </span>
            )}

            {/* Gallery Multi-Photo Controls (Left/Right Navigation & Counter) */}
            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-black/90 hover:scale-105 shadow-md cursor-pointer"
                  title="Previous image"
                  aria-label="Previous image"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-black/90 hover:scale-105 shadow-md cursor-pointer"
                  title="Next image"
                  aria-label="Next image"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Photo Counter & Fullscreen Pill */}
                <div className="absolute right-4 bottom-4 flex items-center gap-2">
                  <span className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold font-mono text-white backdrop-blur-xs shadow-xs">
                    📷 {selectedImageIndex + 1} / {displayImages.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-xs hover:bg-black/90 transition shadow-xs cursor-pointer"
                    title="View fullscreen photo"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Thumbnails Strip (Section 2.6.4) */}
          {displayImages.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                    selectedImageIndex === idx
                      ? "border-[#B89450] ring-2 ring-[#B89450]/30 scale-102"
                      : "border-gray-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  {img && (img.startsWith("http") || img.startsWith("/") || img.startsWith("data:")) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[#B89450]">
                      <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Tour Title & Quick Highlights */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-[#17352A] sm:text-4xl">
              {title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs text-gray-600">
              {/* Tour ID Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#282722] px-3 py-1 font-bold text-[#D1B16A] shadow-xs">
                <span>{effectiveTourType === "Ticket Only" ? "Ticket ID:" : "Tour ID:"}</span>
                <span className="font-mono text-white">{tourCode}</span>
              </span>

              {/* Tour Type Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold ${
                  effectiveTourType === "Ticket Only"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : effectiveTourType === "Transfer Only"
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : effectiveTourType === "Private Tour"
                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                    : effectiveTourType === "Activity Only"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-[#FAF8F3] text-[#17352A] border border-[#D6CEBD]"
                }`}
              >
                {effectiveTourType === "Ticket Only" && "🎟 "}
                {effectiveTourType === "Transfer Only" && "🚐 "}
                {effectiveTourType === "Private Tour" && "👑 "}
                {effectiveTourType === "Activity Only" && "⚡ "}
                {effectiveTourType === "Tour Package" && "🏝 "}
                {effectiveTourType}
              </span>

              {/* Show Times Badge for Ticket Only */}
              {effectiveTourType === "Ticket Only" && extendedData?.ticket_details?.show_times && extendedData.ticket_details.show_times.length > 0 && (
                <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-semibold text-emerald-900">
                  🎭 Show Times: {extendedData.ticket_details.show_times.join(" • ")}
                </span>
              )}

              {/* Category & Subcategory */}
              {extendedData?.category && (
                <span className="flex items-center gap-1.5 rounded-lg bg-[#FAF8F3] border border-[#D6CEBD] px-3 py-1 font-semibold text-[#17352A]">
                  📁 {extendedData.category.toLowerCase().replace(/[-_]/g, " ") === effectiveTourType.toLowerCase().replace(/[-_]/g, " ")
                    ? (extendedData.subcategory || extendedData.category)
                    : `${extendedData.category}${extendedData.subcategory ? ` • ${extendedData.subcategory}` : ""}`}
                </span>
              )}

              {/* Unit Badge (e.g. per ticket, per pass) */}
              {extendedData?.ticket_details?.unit && (
                <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-semibold text-emerald-900">
                  🎫 Unit: {extendedData.ticket_details.unit}
                </span>
              )}

              {/* Pick-up Included Policy */}
              {effectiveTourType !== "Ticket Only" && (
                <span
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold ${
                    !chargesExtraPickup
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border border-amber-200 text-amber-800"
                  }`}
                >
                  {!chargesExtraPickup
                    ? "✓ All-Inclusive (Hotel Pick-up Included)"
                    : "Hotel Pick-up Available (Zone Fee Applies)"}
                </span>
              )}

              {tour.duration && (
                <span className="flex items-center gap-1.5 rounded-lg bg-[#FAF8F3] border border-[#D6CEBD] px-3 py-1 font-semibold text-[#17352A]">
                  ⏱ {tour.duration}
                </span>
              )}
              {tour.operated_days && (
                <span className="flex items-center gap-1.5 rounded-lg bg-[#FAF8F3] border border-[#D6CEBD] px-3 py-1 font-semibold text-[#17352A]">
                  📅 {tour.operated_days}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Booking Summary Card */}
        <aside className="rounded-3xl border border-[#D6CEBD] bg-white p-6 shadow-sm sticky top-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#B89450]">
              Experience Phuket
            </p>
            <span className="rounded-md bg-[#282722] px-2 py-0.5 text-[11px] font-bold font-mono text-[#D1B16A]">
              {effectiveTourType === "Ticket Only" ? "Ticket ID:" : "Tour ID:"} {tourCode}
            </span>
          </div>

          <div className="mt-3 border-b border-gray-100 pb-4">
            <span className="text-xs text-gray-500">From</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[#B89450]">
                {pricingModel === "cooking_class"
                  ? `฿${(cookingDetails.programs?.[1]?.cooking_price ?? 2500).toLocaleString()}`
                  : pricingModel === "activity_atv"
                  ? `฿${(atvPricing.packages?.[0]?.driver_price ?? 1000).toLocaleString()}`
                  : pricingModel === "transfer_timetable"
                  ? `฿${(transferRoutes[0]?.adult_price ?? 1500).toLocaleString()}`
                  : tour.price ? `฿${Number(tour.price).toLocaleString()}` : "Price on request"}
              </span>
              <span className="text-xs text-gray-500">
                {pricingModel === "cooking_class"
                  ? "/ student"
                  : pricingModel === "activity_atv"
                  ? "/ driver"
                  : pricingModel === "transfer_timetable"
                  ? "/ passenger"
                  : extendedData?.ticket_details?.unit
                  ? `/ ${extendedData.ticket_details.unit}`
                  : effectiveTourType === "Ticket Only"
                  ? "/ ticket"
                  : effectiveTourType === "Transfer Only"
                  ? "/ vehicle or trip"
                  : effectiveTourType === "Private Tour"
                  ? "/ charter"
                  : "/ person"}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-xs text-gray-600">
            {pricingModel === "cooking_class" ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Program A (Join 4 Menus):</span>
                  <strong className="text-gray-900 font-mono">฿{(cookingDetails.programs?.[0]?.cooking_price ?? 2800).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center text-gray-500 text-[11px] pl-3">
                  <span>Non-Cooking Companion:</span>
                  <span className="font-mono">฿{(cookingDetails.programs?.[0]?.non_cooking_price ?? 1500).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-1.5">
                  <span className="font-semibold text-gray-800">Program B (Join 3 Menus):</span>
                  <strong className="text-gray-900 font-mono">฿{(cookingDetails.programs?.[1]?.cooking_price ?? 2500).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center text-gray-500 text-[11px] pl-3">
                  <span>Non-Cooking Companion:</span>
                  <span className="font-mono">฿{(cookingDetails.programs?.[1]?.non_cooking_price ?? 1300).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-1.5">
                  <span className="font-semibold text-gray-800">Private Class:</span>
                  <strong className="text-gray-900 font-mono">From ฿15,000</strong>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-700 leading-snug">
                  Choose menu on arrival • Extra dish ฿{(cookingDetails.extra_dish_price ?? 1000).toLocaleString()}
                </div>
              </div>
            ) : pricingModel === "activity_atv" ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Driver Rate:</span>
                  <strong className="text-gray-900 font-mono">From ฿{(atvPricing.packages?.[0]?.driver_price ?? 1000).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Passenger Rate:</span>
                  <strong className="text-gray-900 font-mono">From ฿{(atvPricing.packages?.[0]?.passenger_price ?? 700).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Child (4-11 yrs):</span>
                  <strong className="text-gray-900 font-mono">From ฿{(atvPricing.packages?.[0]?.child_price ?? 700).toLocaleString()}</strong>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-800">
                  <span className="font-bold">5 Sessions Daily: </span>
                  {(atvPricing.session_slots || DEFAULT_ACTIVITY_ATV.session_slots || []).join(", ")}
                </div>
              </div>
            ) : pricingModel === "transfer_timetable" ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Adult Rate:</span>
                  <strong className="text-gray-900 font-mono">฿{(transferRoutes[0]?.adult_price ?? 1500).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Child Rate:</span>
                  <strong className="text-gray-900 font-mono">฿{(transferRoutes[0]?.child_price ?? 1300).toLocaleString()}</strong>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-[11px] text-blue-900">
                  <span className="font-bold">Speedboat Routes: </span>
                  Phuket ⇄ Phi Phi Island ⇄ Krabi
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><AdultIcon className="w-3.5 h-3.5 text-[#B89450]" /> Adult (12+ yrs)</span>
                  <strong className="text-gray-900">฿{Number(tour.price || 0).toLocaleString()}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="flex items-center gap-1.5">
                      <ChildIcon className="w-3.5 h-3.5 text-[#B89450]" /> Child ({tour.child_age_min ?? 4}–{tour.child_age_max ?? 11} yrs)
                    </span>
                    {extendedData?.child_height_min && extendedData?.child_height_max && (
                      <span className="text-[10px] text-amber-800 font-medium block ml-5">
                        Height: {extendedData.child_height_min}–{extendedData.child_height_max} cm
                      </span>
                    )}
                  </div>
                  <strong className="text-gray-900">
                    ฿{Number(tour.child_price || tour.price || 0).toLocaleString()}
                  </strong>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="flex items-center gap-1.5">
                      <InfantIcon className="w-3.5 h-3.5 text-[#B89450]" /> Infant ({tour.infant_age_min ?? 0}–{tour.infant_age_max ?? 2} yrs)
                    </span>
                    {extendedData?.infant_height_max && (
                      <span className="text-[10px] text-emerald-800 font-medium block ml-5">
                        Free entry under {extendedData.infant_height_max} cm
                      </span>
                    )}
                  </div>
                  <strong className="text-emerald-700">
                    {tour.infant_price && tour.infant_price > 0 ? `฿${tour.infant_price.toLocaleString()}` : "Free"}
                  </strong>
                </div>

                {extendedData?.child_height_note && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2 text-[11px] text-amber-900 leading-relaxed">
                    <span className="font-bold">Child Policy: </span>
                    {extendedData.child_height_note}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href={`/${locale}/booking?tour=${encodeURIComponent(tour.title_en)}&tour_id=${tour.id}&price=${tour.price ?? ""}&tour_type=${encodeURIComponent(effectiveTourType)}&pricing_model=${encodeURIComponent(pricingModel)}`}
              className="block w-full rounded-2xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] py-3.5 text-center text-xs font-bold text-[#282722] shadow-md shadow-[#B89450]/20 hover:brightness-105 transition"
            >
              {ctaButtonText}
            </Link>

            <p className="mt-3 text-center text-[11px] text-gray-400">
              {effectiveTourType === "Ticket Only"
                ? "Instant digital e-voucher with fast admission"
                : effectiveTourType === "Transfer Only"
                ? "Direct hotel / airport pickup with flight monitoring"
                : effectiveTourType === "Private Tour"
                ? "Exclusive private charter tailored to your schedule"
                : effectiveTourType === "Activity Only"
                ? "Reserved activity timeslot with equipment included"
                : "Instant booking confirmation with hotel transfer options"}
            </p>
          </div>
        </aside>
      </div>

      {/* Tabs / Tab Navigation (Section 2.6.5) */}
      <section className="rounded-3xl border border-[#D6CEBD] bg-white overflow-hidden shadow-xs">
        {/* Tab Strip */}
        <div className="flex border-b border-[#D6CEBD] bg-[#FAF8F3] overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center px-6 py-4 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-[#B89450] bg-white text-[#17352A]"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/50"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="p-6 md:p-8">
          {/* 1. Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-[#17352A] mb-3">
                  {isThai ? "เกี่ยวกับทัวร์นี้" : isChinese ? "关于此行程" : "About This Experience"}
                </h3>
                <p className="text-sm leading-relaxed text-gray-700">
                  {description || "Join us on an unforgettable exploration crafted to provide luxury, relaxation, and cultural enrichment in Thailand."}
                </p>
              </div>

              {/* 1. Cooking Class Rate Sheet (Replicating Picture 1) */}
              {pricingModel === "cooking_class" && (
                <div className="rounded-3xl border border-[#C8D6E5] bg-white p-6 sm:p-8 shadow-sm">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#B89450]">
                        {isChinese ? "课程套餐与收费标准" : isThai ? "อัตราค่าเรียนและคอร์สทำอาหาร" : "Cooking Academy Rate Sheet"}
                      </span>
                      <h4 className="text-xl font-extrabold text-[#1d3557]">
                        {isChinese ? "泰式料理烹饪班价格与课程规格" : isThai ? "ตารางราคาคลาสเรียนทำอาหารไทย" : "Thai Cooking Class Programs & Rates"}
                      </h4>
                    </div>
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-900">
                      🍳 Join & Private Classes
                    </span>
                  </div>

                  {/* Two-Column Layout replicating Picture 1 */}
                  <div className="grid gap-8 md:grid-cols-2 md:divide-x md:divide-gray-200">
                    {/* Left Column: Program A & B (Join) */}
                    <div className="space-y-6">
                      {/* Program A */}
                      <div className="rounded-2xl bg-[#F8FAFC] border border-blue-100 p-5 space-y-2">
                        <h5 className="text-2xl font-black text-[#1d3557] font-serif tracking-tight">
                          Program A <span className="text-lg font-normal text-gray-500">(Join)</span>
                        </h5>
                        <p className="text-base font-bold text-gray-900">
                          Prices : <span className="font-mono text-[#1d3557] font-black text-lg">฿{(cookingDetails.programs?.[0]?.cooking_price ?? 2800).toLocaleString()} THB</span>
                        </p>
                        <div className="pt-1 space-y-1 text-sm font-semibold text-gray-700">
                          <p className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1d3557]" />
                            <span>{cookingDetails.programs?.[0]?.menus_count ?? 4} MENUS</span>
                          </p>
                          {(cookingDetails.programs?.[0]?.includes_market_tour ?? true) && (
                            <p className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#1d3557]" />
                              <span>Market Tour</span>
                            </p>
                          )}
                          <p className="text-sm font-medium text-gray-800 pt-1">
                            Non Cooking A Person : <span className="font-mono font-bold">฿{(cookingDetails.programs?.[0]?.non_cooking_price ?? 1500).toLocaleString()} THB</span>
                          </p>
                        </div>
                      </div>

                      {/* Program B */}
                      <div className="rounded-2xl bg-[#F8FAFC] border border-blue-100 p-5 space-y-2">
                        <h5 className="text-2xl font-black text-[#1d3557] font-serif tracking-tight">
                          Program B <span className="text-lg font-normal text-gray-500">(Join)</span>
                        </h5>
                        <p className="text-base font-bold text-gray-900">
                          Prices : <span className="font-mono text-[#1d3557] font-black text-lg">฿{(cookingDetails.programs?.[1]?.cooking_price ?? 2500).toLocaleString()} THB</span>
                        </p>
                        <div className="pt-1 space-y-1 text-sm font-semibold text-gray-700">
                          <p className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1d3557]" />
                            <span>{cookingDetails.programs?.[1]?.menus_count ?? 3} MENUS</span>
                          </p>
                          {(cookingDetails.programs?.[1]?.includes_market_tour ?? true) && (
                            <p className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#1d3557]" />
                              <span>Market Tour</span>
                            </p>
                          )}
                          <p className="text-sm font-medium text-gray-800 pt-1">
                            Non Cooking B Person : <span className="font-mono font-bold">฿{(cookingDetails.programs?.[1]?.non_cooking_price ?? 1300).toLocaleString()} THB</span>
                          </p>
                        </div>
                      </div>

                      {/* Red Note at bottom of Left Column (Replicating Picture 1 exactly) */}
                      <p className="text-xs sm:text-sm font-bold text-red-600 font-serif leading-relaxed italic">
                        **Choose the menu on the day that customers come to study.
                      </p>
                    </div>

                    {/* Right Column: Private Class (Half Day & Full Day) */}
                    <div className="space-y-6 md:pl-8">
                      {/* Private Class Half Day */}
                      <div className="rounded-2xl bg-[#F8FAFC] border border-blue-100 p-5 space-y-3">
                        <div>
                          <h5 className="text-2xl font-black text-[#1d3557] font-serif">
                            Private Class
                          </h5>
                          <p className="text-base font-bold text-[#1d3557] font-serif">
                            Half Day : {cookingDetails.private_tiers?.find(t => t.class_type === "Half Day")?.menus_count ?? 4} menus
                          </p>
                        </div>
                        <div className="space-y-1.5 text-sm font-medium text-gray-800 font-mono">
                          {(cookingDetails.private_tiers?.filter((t) => t.class_type === "Half Day") || [
                            { tier_label: "1-5 Pax", price: 15000 },
                            { tier_label: "6-8 Pax", price: 24000 },
                            { tier_label: "9-16 Pax", price: 42000 },
                          ]).map((tier, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                              <span className="text-gray-700 font-sans">{tier.tier_label}</span>
                              <span className="font-bold text-gray-900">: Thb {tier.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Private Class Full Day */}
                      <div className="rounded-2xl bg-[#F8FAFC] border border-blue-100 p-5 space-y-3">
                        <div>
                          <h5 className="text-2xl font-black text-[#1d3557] font-serif">
                            Private Class
                          </h5>
                          <p className="text-base font-bold text-[#1d3557] font-serif">
                            Full Day : {cookingDetails.private_tiers?.find(t => t.class_type === "Full Day")?.menus_count ?? 7} menus
                          </p>
                        </div>
                        <div className="space-y-1.5 text-sm font-medium text-gray-800 font-mono">
                          {(cookingDetails.private_tiers?.filter((t) => t.class_type === "Full Day") || [
                            { tier_label: "1-5 Pax", price: 22000 },
                            { tier_label: "6-8 Pax", price: 40000 },
                            { tier_label: "9-16 Pax", price: 65000 },
                          ]).map((tier, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                              <span className="text-gray-700 font-sans">{tier.tier_label}</span>
                              <span className="font-bold text-gray-900">: Thb {tier.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Red Note at bottom of Right Column (Replicating Picture 1 exactly) */}
                      <p className="text-sm font-bold text-red-600 font-serif">
                        Extra Dish {(cookingDetails.extra_dish_price ?? 1000).toLocaleString()} THB Per Dish
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Activities / ATV Safari Rate Packages (Replicating Ticket2Attraction) */}
              {pricingModel === "activity_atv" && (
                <div className="rounded-3xl border border-rose-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                        Phuket Big Buddha Outdoor Adventure
                      </span>
                      <h4 className="text-xl font-extrabold text-gray-900">
                        ATV Safari Tour Packages & Pricing
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                      <span>⚡ Off-Road Jungle Trails</span>
                    </div>
                  </div>

                  {/* Package Cards Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(atvPricing.packages || DEFAULT_ACTIVITY_ATV.packages).map((pkg) => (
                      <div
                        key={pkg.id}
                        className="rounded-2xl border border-gray-200 bg-stone-50/50 p-5 hover:border-rose-300 hover:shadow-md transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-gray-900 text-base">{pkg.name}</h5>
                            <span className="inline-block rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[11px] font-semibold mt-1">
                              ⏱ {pkg.duration}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                            From ฿{pkg.driver_price.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{pkg.description}</p>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/80 text-center font-mono">
                          <div className="rounded-lg bg-white p-2 border border-gray-200">
                            <span className="block text-[10px] uppercase font-sans font-semibold text-gray-500">Driver</span>
                            <span className="font-bold text-gray-900 text-xs">฿{pkg.driver_price.toLocaleString()}</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-gray-200">
                            <span className="block text-[10px] uppercase font-sans font-semibold text-gray-500">Passenger</span>
                            <span className="font-bold text-gray-900 text-xs">฿{pkg.passenger_price.toLocaleString()}</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-gray-200">
                            <span className="block text-[10px] uppercase font-sans font-semibold text-gray-500">Child (4-11)</span>
                            <span className="font-bold text-gray-900 text-xs">{pkg.child_price ? `฿${pkg.child_price.toLocaleString()}` : "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Session Slots & Inclusions */}
                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🕒</span> Daily Session Departure Time Slots:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(atvPricing.session_slots || DEFAULT_ACTIVITY_ATV.session_slots || []).map((slot, i) => (
                          <span key={i} className="rounded-lg bg-white border border-amber-300 px-3 py-1 text-xs font-bold font-mono text-amber-900 shadow-2xs">
                            {slot} hrs
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-900">
                      🛡 <strong>Safety & Equipment Included:</strong> Professional protective helmet, safety orientation, licensed trail guide, cold bottled drinking water, and standard accident insurance.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Speedboat Transfer Service Boat Timetable (Replicating Picture 2) */}
              {pricingModel === "transfer_timetable" && (
                <div className="rounded-3xl border border-blue-200 bg-[#FFFDF8] p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Replicating Picture 2 Header Banner */}
                  <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 p-6 text-center text-white shadow-md relative overflow-hidden">
                    <p className="text-xl sm:text-2xl font-bold font-serif italic text-amber-100 drop-shadow-sm">
                      Speedboat transfer service
                    </p>
                    <h4 className="text-2xl sm:text-3xl font-black tracking-wider text-white mt-1 drop-shadow-md">
                      BOAT TIMETABLE
                    </h4>
                    <p className="text-xs sm:text-sm font-semibold tracking-wide text-amber-50 mt-1 uppercase">
                      RASSADA PIER, PHUKET – TONSAI PIER – LAEMTONG BEACH, PHI PHI ISLAND
                    </p>
                  </div>

                  {/* Schedule Blocks Replicating Picture 2 */}
                  <div className="space-y-6">
                    {/* 1. Schedule: Phuket - Phi Phi Island & Phi Phi Island - Phuket */}
                    <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Phuket - Phi Phi Island */}
                        <div>
                          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                            Schedule : Phuket - Phi Phi Island
                          </div>
                          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                <tr className="bg-[#1a3a6c] text-white">
                                  <th className="py-2 px-2 border-r border-blue-800">DEPARTURE</th>
                                  <th className="py-2 px-2 border-r border-blue-800">ARRIVE</th>
                                  <th colSpan={2} className="py-2 px-2">SELLING</th>
                                </tr>
                                <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                                  <th className="py-1 px-2 border-r border-blue-800">Rassada Pier</th>
                                  <th className="py-1 px-2 border-r border-blue-800">Tonsai Pier</th>
                                  <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                                  <th className="py-1 px-1">Child</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                  <td className="py-1.5 px-2">09.30 hrs.</td>
                                  <td className="py-1.5 px-2">10.30 hrs.</td>
                                  <td rowSpan={4} className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200 align-middle">1,500</td>
                                  <td rowSpan={4} className="py-2 px-2 font-bold text-gray-900 align-middle">1,300</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">10.30 hrs.</td>
                                  <td className="py-1.5 px-2">11.30 hrs.</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">14.00 hrs.</td>
                                  <td className="py-1.5 px-2">15.00 hrs.</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">15.30 hrs.</td>
                                  <td className="py-1.5 px-2">16.30 hrs.</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Phi Phi Island - Phuket */}
                        <div>
                          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                            Schedule : Phi Phi Island - Phuket
                          </div>
                          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                <tr className="bg-[#1a3a6c] text-white">
                                  <th className="py-2 px-2 border-r border-blue-800">DEPARTURE</th>
                                  <th className="py-2 px-2 border-r border-blue-800">ARRIVE</th>
                                  <th colSpan={2} className="py-2 px-2">SELLING</th>
                                </tr>
                                <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                                  <th className="py-1 px-2 border-r border-blue-800">Tonsai Pier</th>
                                  <th className="py-1 px-2 border-r border-blue-800">Rassada Pier</th>
                                  <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                                  <th className="py-1 px-1">Child</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                  <td className="py-1.5 px-2">08.30 hrs.</td>
                                  <td className="py-1.5 px-2">09.30 hrs.</td>
                                  <td rowSpan={4} className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200 align-middle">1,500</td>
                                  <td rowSpan={4} className="py-2 px-2 font-bold text-gray-900 align-middle">1,300</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">12.00 hrs.</td>
                                  <td className="py-1.5 px-2">13.00 hrs.</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">13.00 hrs.</td>
                                  <td className="py-1.5 px-2">14.00 hrs.</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">15.30 hrs.</td>
                                  <td className="py-1.5 px-2">16.30 hrs.</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Schedule: Phuket - Laemtong Beach & Laemtong Beach - Phuket */}
                    <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-xs space-y-2">
                      <p className="text-[11px] text-gray-500 italic text-center">
                        (Phi Phi Holiday - Erawan Palms - Phi Phi Natural - Centara Villa - SAii PP Village)
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="bg-amber-600 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                            Schedule : Phuket - Laemtong Beach
                          </div>
                          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                <tr className="bg-[#1a3a6c] text-white">
                                  <th className="py-2 px-2 border-r border-blue-800">DEPARTURE</th>
                                  <th className="py-2 px-2 border-r border-blue-800">ARRIVE</th>
                                  <th colSpan={2} className="py-2 px-2">SELLING</th>
                                </tr>
                                <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                                  <th className="py-1 px-2 border-r border-blue-800">Rassada Pier</th>
                                  <th className="py-1 px-2 border-r border-blue-800">Laemtong Beach</th>
                                  <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                                  <th className="py-1 px-1">Child</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                  <td className="py-2 px-2">14.00 hrs.</td>
                                  <td className="py-2 px-2">15.30 hrs.</td>
                                  <td className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200">1,500</td>
                                  <td className="py-2 px-2 font-bold text-gray-900">1,300</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <div className="bg-amber-600 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                            Schedule : Laemtong Beach - Phuket
                          </div>
                          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                <tr className="bg-[#1a3a6c] text-white">
                                  <th className="py-2 px-2 border-r border-blue-800">DEPARTURE</th>
                                  <th className="py-2 px-2 border-r border-blue-800">ARRIVE</th>
                                  <th colSpan={2} className="py-2 px-2">SELLING</th>
                                </tr>
                                <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                                  <th className="py-1 px-2 border-r border-blue-800">Laemtong Beach</th>
                                  <th className="py-1 px-2 border-r border-blue-800">Rassada Pier</th>
                                  <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                                  <th className="py-1 px-1">Child</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                  <td className="py-2 px-2">07.50 hrs.</td>
                                  <td className="py-2 px-2">09.30 hrs.</td>
                                  <td className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200">1,500</td>
                                  <td className="py-2 px-2 font-bold text-gray-900">1,300</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Schedule: Ao Po Grand Marina - Laemtong Beach & return */}
                    <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-xs space-y-2">
                      <p className="text-[11px] text-gray-500 italic text-center">
                        (Phi Phi Holiday - Erawan Palms - Phi Phi Natural - Centara Villa - SAii PP Village)
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="bg-amber-600 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                            Schedule : Ao Po Grand Marina - Laemtong Beach
                          </div>
                          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                <tr className="bg-[#1a3a6c] text-white">
                                  <th className="py-2 px-2 border-r border-blue-800">DEPARTURE</th>
                                  <th className="py-2 px-2 border-r border-blue-800">ARRIVE</th>
                                  <th colSpan={2} className="py-2 px-2">SELLING</th>
                                </tr>
                                <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                                  <th className="py-1 px-2 border-r border-blue-800">Ao Po Grand Marina</th>
                                  <th className="py-1 px-2 border-r border-blue-800">Laemtong Beach</th>
                                  <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                                  <th className="py-1 px-1">Child</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                  <td className="py-1.5 px-2">11.30 hrs.</td>
                                  <td className="py-1.5 px-2">12.30 hrs.</td>
                                  <td rowSpan={2} className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200 align-middle">1,800</td>
                                  <td rowSpan={2} className="py-2 px-2 font-bold text-gray-900 align-middle">1,600</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">16.00 hrs.</td>
                                  <td className="py-1.5 px-2">17.00 hrs.</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <div className="bg-amber-600 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                            Schedule : Laemtong Beach - Ao Po Grand Marina
                          </div>
                          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                            <table className="w-full text-xs text-center border-collapse">
                              <thead>
                                <tr className="bg-[#1a3a6c] text-white">
                                  <th className="py-2 px-2 border-r border-blue-800">DEPARTURE</th>
                                  <th className="py-2 px-2 border-r border-blue-800">ARRIVE</th>
                                  <th colSpan={2} className="py-2 px-2">SELLING</th>
                                </tr>
                                <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                                  <th className="py-1 px-2 border-r border-blue-800">Laemtong Beach</th>
                                  <th className="py-1 px-2 border-r border-blue-800">Ao Po Grand Marina</th>
                                  <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                                  <th className="py-1 px-1">Child</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono">
                                <tr>
                                  <td className="py-1.5 px-2">10.00 hrs.</td>
                                  <td className="py-1.5 px-2">11.00 hrs.</td>
                                  <td rowSpan={2} className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200 align-middle">1,800</td>
                                  <td rowSpan={2} className="py-2 px-2 font-bold text-gray-900 align-middle">1,600</td>
                                </tr>
                                <tr>
                                  <td className="py-1.5 px-2">14.00 hrs.</td>
                                  <td className="py-1.5 px-2">15.00 hrs.</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Schedule: Phuket - Phi Phi Island - Krabi */}
                    <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-xs space-y-2">
                      <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase tracking-wide text-center">
                        Schedule : Phuket - Phi Phi Island - Krabi
                      </div>
                      <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className="bg-[#1a3a6c] text-white">
                              <th colSpan={2} className="py-2 px-2 border-r border-blue-800">By Speedboat</th>
                              <th colSpan={2} className="py-2 px-2 border-r border-blue-800">/ By Speedboat</th>
                              <th colSpan={2} className="py-2 px-2">SELLING</th>
                            </tr>
                            <tr className="bg-[#1a3a6c]/90 text-white text-[10px]">
                              <th className="py-1 px-2 border-r border-blue-800">DEPARTURE<br/>Rassada Pier (Phuket)</th>
                              <th className="py-1 px-2 border-r border-blue-800">ARRIVE<br/>Tonsai Pier</th>
                              <th className="py-1 px-2 border-r border-blue-800">DEPARTURE<br/>Tonsai Pier</th>
                              <th className="py-1 px-2 border-r border-blue-800">ARRIVE<br/>Railay/Ao-Nang (Kong Ka Pier)</th>
                              <th className="py-1 px-1 border-r border-blue-800">Adult</th>
                              <th className="py-1 px-1">Child</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-mono">
                            <tr>
                              <td className="py-1.5 px-2">09.30 hrs.</td>
                              <td className="py-1.5 px-2">10.30 hrs.</td>
                              <td className="py-1.5 px-2 border-l border-gray-200">10.00 hrs.</td>
                              <td className="py-1.5 px-2">11.00 hrs.</td>
                              <td rowSpan={4} className="py-2 px-2 font-bold text-gray-900 border-x border-gray-200 align-middle">1,800</td>
                              <td rowSpan={4} className="py-2 px-2 font-bold text-gray-900 align-middle">1,600</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2">10.30 hrs.</td>
                              <td className="py-1.5 px-2">11.30 hrs.</td>
                              <td className="py-1.5 px-2 border-l border-gray-200">12.00 hrs.</td>
                              <td className="py-1.5 px-2">13.00 hrs.</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2">14.00 hrs.</td>
                              <td className="py-1.5 px-2">15.00 hrs.</td>
                              <td className="py-1.5 px-2 border-l border-gray-200">15.00 hrs.</td>
                              <td className="py-1.5 px-2">16.00 hrs.</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-2">15.30 hrs.</td>
                              <td className="py-1.5 px-2">16.30 hrs.</td>
                              <td className="py-1.5 px-2 border-l border-gray-200">17.00 hrs.</td>
                              <td className="py-1.5 px-2">18.00 hrs.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Type-Specific Panels */}
              {effectiveTourType === "Ticket Only" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <span>🎟</span>
                      <span>
                        {isThai
                          ? "รายละเอียดบัตรเข้าชมและรอบการแสดง"
                          : isChinese
                          ? "门票规格与入园详情"
                          : "Ticket Details & Admission Specifications"}
                      </span>
                    </h4>
                    {extendedData?.ticket_details?.unit && (
                      <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-900 font-mono">
                        Unit: {extendedData.ticket_details.unit}
                      </span>
                    )}
                  </div>

                  {/* Dynamic Customizable Fields Grid */}
                  {ticketFields.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                      {ticketFields.map((field, idx) => (
                        <div
                          key={field.id || idx}
                          className="rounded-xl bg-white border border-emerald-200/80 p-3 shadow-2xs"
                        >
                          <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider mb-1">
                            {field.label}:
                          </span>
                          <p className="text-gray-700 leading-relaxed font-medium">
                            {field.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show Times Schedule */}
                  {extendedData?.ticket_details?.show_times && extendedData.ticket_details.show_times.length > 0 && (
                    <div className="rounded-xl bg-white border border-emerald-200 p-3">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1.5">
                        <span>🎭</span>
                        <span>
                          {isThai
                            ? "รอบเวลาการแสดงประจำวัน:"
                            : isChinese
                            ? "每日演出时间:"
                            : "Daily Show Times:"}
                        </span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {extendedData.ticket_details.show_times.map((st, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-900"
                          >
                            🕒 {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hotel Transfer Add-on info */}
                  {extendedData?.ticket_details?.has_transfer_addon && (
                    <div className="rounded-xl bg-white border border-emerald-200 p-2.5 text-xs text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-950 font-medium">
                        <span>🚐</span>
                        <span>
                          {isThai
                            ? "มีบริการเสริมรถรับ-ส่งโรงแรมให้เลือกซื้อ"
                            : isChinese
                            ? "提供可选酒店接送附加服务"
                            : "Optional Hotel Transfer Add-on Available"}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-emerald-800">
                        +THB {extendedData.ticket_details.transfer_price ?? 350} / person
                      </span>
                    </div>
                  )}
                </div>
              )}

              {effectiveTourType === "Transfer Only" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <span>🚐</span> Transfer Service Specifications
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="font-semibold text-blue-950">Service Type:</span>
                      <p className="text-gray-700 mt-0.5">{extendedData?.transfer_details?.service_type || "Airport / Hotel Transfer"}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-950">Luggage Allowance:</span>
                      <p className="text-gray-700 mt-0.5">{extendedData?.transfer_details?.luggage_policy || "1 standard suitcase + 1 carry-on per passenger"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-blue-950">Available Fleet Vehicles:</span>
                      <p className="text-gray-700 mt-0.5">{(extendedData?.transfer_details?.vehicle_types || ["VIP Toyota Commuter Van", "Executive Sedan"]).join(" • ")}</p>
                    </div>
                  </div>
                </div>
              )}

              {effectiveTourType === "Activity Only" && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <span>⚡</span> Activity Session & Gear Details
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="font-semibold text-rose-950">Activity Duration:</span>
                      <p className="text-gray-700 mt-0.5">{extendedData?.activity_details?.duration || "Approx. 2 Hours"}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-rose-950">Session Time Slots:</span>
                      <p className="text-gray-700 mt-0.5">{(extendedData?.activity_details?.session_slots || ["Morning 09:00", "Afternoon 13:30"]).join(" | ")}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-rose-950">Equipment Included:</span>
                      <p className="text-gray-700 mt-0.5">{(extendedData?.activity_details?.equipment_provided || ["Safety helmet & gear", "Instructor guide"]).join(" • ")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Not Recommended Alert Notice */}
              {notRecommendedList.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-950">
                  <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                    <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {isChinese ? "安全提示：不建议以下人群参加" : isThai ? "คำแนะนำด้านความปลอดภัย: ไม่แนะนำสำหรับ" : "Safety Advisory: Are Not Recommended For"}
                  </div>
                  <p className="text-xs text-amber-800 mb-3">
                    {isChinese
                      ? "为了您的安全与舒适体验，本活动不建议以下身体状况的旅客参加："
                      : isThai
                      ? "เพื่อความปลอดภัยและความสะดวกสบายของผู้ร่วมเดินทาง กิจกรรมนี้ไม่แนะนำสำหรับ:"
                      : "For safety, comfort, and insurance reasons, this tour/activity is not suitable or recommended for:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notRecommendedList.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs"
                      >
                        <span className="text-amber-600">⚠</span> {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Custom Extra Specifications & Info Fields */}
              {extendedData?.custom_fields && extendedData.custom_fields.length > 0 && (
                <div className="rounded-2xl border border-[#D6CEBD] bg-[#FAF8F3] p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#17352A] flex items-center gap-1.5">
                    <span>📌</span>
                    {isThai ? "ข้อมูลและคุณสมบัติเพิ่มเติม" : isChinese ? "更多行程特色与规格" : "Key Specifications & Tour Highlights"}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                    {extendedData.custom_fields.map((cf) => {
                      const name = (isThai ? cf.name_th : isChinese ? cf.name_zh : cf.name_en) || cf.name_en;
                      const val = (isThai ? cf.value_th : isChinese ? cf.value_zh : cf.value_en) || cf.value_en;
                      return (
                        <div key={cf.id} className="rounded-xl bg-white border border-[#D6CEBD]/60 p-3 shadow-2xs">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B89450] block">
                            {name}
                          </span>
                          <span className="mt-1 font-semibold text-[#17352A] text-xs block">
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Ticket Tiers (if configured) */}
              {extendedData?.ticket_types && extendedData.ticket_types.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <span>🎟</span>
                    {isThai ? "ประเภทบัตรที่มีจำหน่าย" : isChinese ? "可选门票类别" : "Available Ticket Categories"}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    {extendedData.ticket_types.map((tier) => {
                      const name = (isThai ? tier.name_th : isChinese ? tier.name_zh : tier.name_en) || tier.name_en;
                      const adultP = tier.adult_price ?? tier.price;
                      const childP = tier.child_price;
                      return (
                        <div key={tier.id} className="rounded-xl bg-white border border-emerald-200 p-3 shadow-2xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-emerald-950">{name}</span>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-[#B89450] block">
                                <span className="text-[10px] font-normal text-gray-500 mr-1">Adult</span>
                                THB {adultP.toLocaleString()}
                              </span>
                              {childP !== undefined && childP !== null && (
                                <span className="font-mono text-[11px] font-semibold text-gray-600 block mt-0.5">
                                  <span className="text-[10px] font-normal text-gray-500 mr-1">Child</span>
                                  THB {childP.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {tier.child_height_note && (
                            <span className="inline-block mt-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                              📏 {tier.child_height_note}
                            </span>
                          )}
                          {tier.description_en && (
                            <p className="text-[11px] text-gray-500 mt-1">{tier.description_en}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Tour Add-ons / Extras (if configured) */}
              {extendedData?.optional_addons && extendedData.optional_addons.length > 0 && (
                <div className="rounded-2xl border border-[#D6CEBD] bg-[#FAF8F3] p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#17352A] flex items-center gap-1.5">
                    <span>✨</span>
                    {isThai ? "บริการเสริมและอัปเกรดพิเศษ" : isChinese ? "可选升级与增值服务" : "Optional Upgrades & Add-ons"}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    {extendedData.optional_addons.map((addon) => {
                      const name = (isThai ? addon.name_th : isChinese ? addon.name_zh : addon.name_en) || addon.name_en;
                      return (
                        <div key={addon.id} className="rounded-xl bg-white border border-[#D6CEBD]/60 p-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#17352A]">{name}</span>
                            <span className="font-mono font-bold text-[#B89450]">
                              +THB {addon.price.toLocaleString()}
                              <span className="text-[10px] text-gray-500 font-normal ml-1">
                                ({addon.price_type === "per_person" ? (isThai ? "ต่อท่าน" : isChinese ? "每人" : "per person") : (isThai ? "ต่อการจอง" : isChinese ? "每单" : "per booking")})
                              </span>
                            </span>
                          </div>
                          {addon.description_en && (
                            <p className="text-[11px] text-gray-500 mt-1">{addon.description_en}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-gray-100">
                <div className="rounded-2xl bg-[#FAF8F3] p-4 border border-[#D6CEBD]/60">
                  <p className="text-xs font-bold text-[#B89450] uppercase">Operating Days</p>
                  <p className="mt-1 font-semibold text-sm text-[#17352A]">
                    {tour.operated_days || "Daily"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FAF8F3] p-4 border border-[#D6CEBD]/60">
                  <p className="text-xs font-bold text-[#B89450] uppercase">Duration</p>
                  <p className="mt-1 font-semibold text-sm text-[#17352A]">
                    {tour.duration || "Full Day (~8 hrs)"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FAF8F3] p-4 border border-[#D6CEBD]/60">
                  <p className="text-xs font-bold text-[#B89450] uppercase">Departure</p>
                  <p className="mt-1 font-semibold text-sm text-[#17352A]">
                    {tour.start_time || "08:00 AM"} – {tour.end_time || "17:00 PM"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Itinerary Tab */}
          {activeTab === "itinerary" && (
            <div className="space-y-6 max-w-4xl">
              <h3 className="text-lg font-bold text-[#17352A]">
                {isThai ? "ตารางเวลาการเดินทาง" : isChinese ? "行程时间表" : "Tour Schedule & Activities"}
              </h3>

              {itinerary.length === 0 ? (
                <p className="text-xs text-gray-500">Detailed schedule available upon booking confirmation.</p>
              ) : (
                <div className="space-y-6">
                  {itinerary.map((item, idx) => {
                    const activity = isThai
                      ? item.activity_th || item.activity_en
                      : isChinese
                      ? item.activity_zh || item.activity_en
                      : item.activity_en;

                    return (
                      <div
                        key={item.id || idx}
                        className="flex gap-4 border-l-2 border-[#B89450] pl-5 pb-6 last:border-l-0"
                      >
                        <div className="space-y-2 flex-1">
                          <span className="font-mono text-xs font-bold text-[#B89450] bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            {item.time}
                          </span>
                          <p className="text-sm font-medium text-gray-800 mt-2">
                            {activity}
                          </p>
                          {item.image_signed_url && (
                            <div className="mt-3 overflow-hidden rounded-2xl max-h-60 max-w-md border border-gray-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image_signed_url}
                                alt="Activity visual"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. What's Included Tab */}
          {activeTab === "includes" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-[#17352A] mb-4 flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  {isThai ? "รายการที่รวมอยู่ในแพ็กเกจ" : isChinese ? "费用包含" : "Package Inclusions"}
                </h3>

                <ul className="grid gap-3 sm:grid-cols-2 text-xs text-gray-700">
                  {includesList.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 rounded-lg bg-[#FAF8F3] p-2.5 border border-[#D6CEBD]/50">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-red-500">✕</span>
                  {isThai ? "รายการที่ไม่รวม (Exclusions)" : isChinese ? "费用不含 (Exclusions)" : "Exclusions"}
                </h4>
                <ul className="grid gap-2 sm:grid-cols-2 text-xs text-gray-500">
                  {excludesList.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 border border-gray-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 4. Important Information & Policies Tab */}
          {activeTab === "policy" && (
            <div className="space-y-6 max-w-4xl text-xs text-gray-700 leading-relaxed">
              {/* What to Bring Section */}
              <div className="rounded-2xl border border-[#D6CEBD] bg-[#FAF8F3] p-5">
                <h4 className="text-sm font-bold text-[#17352A] mb-3 flex items-center gap-2">
                  <span>🎒</span>
                  {isChinese ? "建议携带物品 (What to Bring)" : isThai ? "สิ่งที่ควรนำมาด้วย (What to Bring)" : "What to Bring"}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {whatToBringList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 rounded-md bg-white p-2 border border-[#E5E0D8]">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not Recommended Safety Notice */}
              {notRecommendedList.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-amber-950">
                  <p className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                    <span>⚠️</span>
                    {isChinese ? "身体状况限制 (Are Not Recommended)" : isThai ? "ข้อจำกัดด้านสุขภาพ (Not Recommended)" : "Health & Safety Restrictions (Not Recommended)"}
                  </p>
                  <ul className="space-y-1 pl-4 list-disc text-amber-900 text-xs">
                    {notRecommendedList.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General Info & Dynamic Cancellation Policies */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#17352A]">
                  {isThai ? "ข้อมูลสำคัญและนโยบายการจอง" : isChinese ? "重要信息与预订政策" : "Important Information & Cancellation Policy"}
                </h3>

                {/* Cancellation & Refund Policy Card (Configured by Tour Type) */}
                <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-bold text-sm">✓</span>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#17352A]">
                        {isThai ? "นโยบายการยกเลิกและการคืนเงิน" : isChinese ? "取消与退款政策" : "Cancellation & Refund Terms"}
                      </h4>
                    </div>
                    <span className="rounded-full bg-[#FAF8F3] border border-[#D6CEBD] px-2.5 py-0.5 text-[10px] font-bold text-[#17352A]">
                      {effectiveTourType}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                    {isThai
                      ? effectiveCancellation.summary_th
                      : isChinese
                      ? effectiveCancellation.summary_zh
                      : effectiveCancellation.summary_en}
                  </p>

                  {/* Detailed Refund & Reschedule Grid */}
                  <div className="grid gap-2 sm:grid-cols-2 pt-1 text-xs">
                    <div className="rounded-xl bg-[#FAF8F3] p-3 border border-[#E5E0D8] space-y-1">
                      <span className="font-bold text-[#17352A] block text-[11px] uppercase tracking-wider">
                        {isThai ? "เงื่อนไขการคืนเงิน (Refund Deadlines)" : isChinese ? "退款梯度与比例" : "Refund Conditions & Percentages"}
                      </span>
                      <p className="text-gray-700 whitespace-pre-line text-[11px] font-mono leading-relaxed">
                        {isThai
                          ? effectiveCancellation.refund_conditions_th
                          : isChinese
                          ? effectiveCancellation.refund_conditions_zh
                          : effectiveCancellation.refund_conditions_en}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#FAF8F3] p-3 border border-[#E5E0D8] space-y-1">
                      <span className="font-bold text-[#17352A] block text-[11px] uppercase tracking-wider">
                        {isThai ? "การเลื่อนวันเดินทาง (Date Changes)" : isChinese ? "改期政策与时限" : "Date Changes & Rescheduling"}
                      </span>
                      <p className="text-gray-700 text-[11px] leading-relaxed">
                        {isThai
                          ? effectiveCancellation.reschedule_policy_th
                          : isChinese
                          ? effectiveCancellation.reschedule_policy_zh
                          : effectiveCancellation.reschedule_policy_en}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 100% Weather & Maritime Safety Guarantee Card */}
                <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-700 font-bold text-sm">🌊</span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-sky-900">
                      {isThai ? "การรับประกันความปลอดภัยและสภาพอากาศ 100%" : isChinese ? "100% 恶劣天气与航行安全保障" : "100% Weather & Safety Guarantee"}
                    </h4>
                  </div>
                  <p className="text-xs text-sky-950 leading-relaxed">
                    {isThai
                      ? effectiveCancellation.weather_or_noshow_clause_th
                      : isChinese
                      ? effectiveCancellation.weather_or_noshow_clause_zh
                      : effectiveCancellation.weather_or_noshow_clause_en}
                  </p>
                </div>

                {/* PDPA Data Protection & Privacy Notice Card */}
                <div className="rounded-2xl border border-[#D6CEBD] bg-[#FAF8F3] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-[#17352A] flex items-center gap-1.5">
                        <span>🛡️</span>
                        {isThai ? "การคุ้มครองข้อมูลส่วนบุคคล (PDPA)" : isChinese ? "个人数据保护法（PDPA）合规" : "Personal Data Protection (PDPA)"}
                      </h4>
                      <span className="rounded-md bg-white border border-[#D6CEBD] px-2 py-0.5 text-[9px] font-bold text-gray-600">
                        {effectiveTourType}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5D5A50] mt-1 max-w-xl">
                      {isThai
                        ? `เก็บรวบรวมข้อมูล: ${effectivePdpa.required_info_th}`
                        : isChinese
                        ? `需申报信息：${effectivePdpa.required_info_zh}`
                        : `Required Data for ${effectiveTourType}: ${effectivePdpa.required_info_en}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPdpaModalOpen(true)}
                    className="shrink-0 rounded-xl border border-[#B89450] bg-white px-3.5 py-1.5 text-xs font-bold text-[#B89450] hover:bg-[#B89450] hover:text-white transition-colors cursor-pointer"
                  >
                    {isThai ? "อ่านนโยบาย PDPA" : isChinese ? "阅读PDPA隐私说明" : "Read PDPA Notice"}
                  </button>
                </div>

                {/* Tour Custom Important Info */}
                {importantInfo && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <h4 className="font-bold text-xs text-[#17352A] mb-2">
                      {isThai ? "ข้อควรรู้เพิ่มเติมประจำทัวร์" : isChinese ? "特别提示" : "Special Tour Notes"}
                    </h4>
                    <p className="whitespace-pre-line text-xs text-gray-600 leading-relaxed">
                      {importantInfo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PDPA Privacy Policy Modal */}
      {isPdpaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-[#17352A] flex items-center gap-2">
                  <span>🛡️</span>
                  {isThai
                    ? sitePolicies?.pdpa?.modal_title_th
                    : isChinese
                    ? sitePolicies?.pdpa?.modal_title_zh
                    : sitePolicies?.pdpa?.modal_title_en || "PDPA Privacy & Data Protection Notice"}
                </h3>
                <span className="text-[11px] font-semibold text-[#B89450]">
                  Specific Disclosure: {effectiveTourType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPdpaModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 text-xs text-gray-700 space-y-4 pr-2">
              {/* Tour-Type Specific Notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <span>📌</span>
                  {isThai
                    ? `ข้อกำหนดข้อมูลเฉพาะสำหรับ "${effectiveTourType}"`
                    : isChinese
                    ? `针对“${effectiveTourType}”的特别信息申报要求`
                    : `Data Requirements for "${effectiveTourType}"`}
                </span>
                <div className="space-y-1.5 text-[11px] text-emerald-900">
                  <p>
                    <strong>{isThai ? "ข้อมูลที่จำเป็น:" : isChinese ? "所需个人信息：" : "Information Required: "}</strong>
                    {isThai ? effectivePdpa.required_info_th : isChinese ? effectivePdpa.required_info_zh : effectivePdpa.required_info_en}
                  </p>
                  <p>
                    <strong>{isThai ? "วัตถุประสงค์ในการใช้:" : isChinese ? "信息使用目的：" : "Purpose of Use: "}</strong>
                    {isThai ? effectivePdpa.purpose_th : isChinese ? effectivePdpa.purpose_zh : effectivePdpa.purpose_en}
                  </p>
                  {effectivePdpa.additional_disclosures_en && (
                    <p>
                      <strong>{isThai ? "ผู้มีอำนาจรับข้อมูล:" : isChinese ? "合规披露方：" : "Authorized Disclosures: "}</strong>
                      {isThai ? effectivePdpa.additional_disclosures_th : isChinese ? effectivePdpa.additional_disclosures_zh : effectivePdpa.additional_disclosures_en}
                    </p>
                  )}
                </div>
              </div>

              {/* Shared General Principles */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <h4 className="font-bold text-gray-900 text-xs">
                  {isThai ? "หลักการคุ้มครองข้อมูลส่วนบุคคลทั่วไป (PDPA B.E. 2562)" : isChinese ? "通用个人数据保护合规原则（PDPA）" : "General Personal Data Protection Principles (PDPA B.E. 2562)"}
                </h4>
                <div className="whitespace-pre-line leading-relaxed text-[11px] text-gray-600">
                  {isThai
                    ? sitePolicies?.pdpa?.full_policy_th
                    : isChinese
                    ? sitePolicies?.pdpa?.full_policy_zh
                    : sitePolicies?.pdpa?.full_policy_en}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                PDPA Version {sitePolicies?.pdpa?.version || "v2.5"} • Updated {sitePolicies?.pdpa?.last_updated || "2026-10-26"}
              </span>
              <button
                type="button"
                onClick={() => setIsPdpaModalOpen(false)}
                className="rounded-xl bg-[#17352A] px-5 py-2 text-xs font-bold text-white hover:bg-[#122b22] transition-colors cursor-pointer"
              >
                {isThai ? "เข้าใจแล้ว ปิดหน้าต่าง" : isChinese ? "了解并关闭" : "Close Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-2xl font-bold cursor-pointer"
              aria-label="Close lightbox"
            >
              ✕
            </button>

            {/* Main Fullscreen Image */}
            <div className="relative max-h-[75vh] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={title}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />

              {/* Prev / Next in Lightbox */}
              {displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1))
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition shadow-lg cursor-pointer"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((prev) =>
                        prev < displayImages.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition shadow-lg cursor-pointer"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Bottom Strip: Counter & Thumbnails */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-mono font-bold text-[#D1B16A]">
                {selectedImageIndex + 1} of {displayImages.length}
              </span>
              {displayImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                  {displayImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer ${
                        selectedImageIndex === idx
                          ? "border-[#D1B16A] scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

