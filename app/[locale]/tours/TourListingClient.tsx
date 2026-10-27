"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTourDisplayCode } from "@/lib/tour-code";
import {
  buildSearchableTourText,
  matchesSearchQuery,
  isDestinationMatch,
  isCategoryMatch,
  getLocalizedCategory,
  getLocalizedSubcategory,
  getLocalizedDestination,
  getLocalizedTourType,
  normalizeText,
} from "@/lib/tour-i18n";

export type ListingTour = {
  id: number;
  title_en: string | null;
  title_zh: string | null;
  title_th: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_th: string | null;
  image_url: string | null;
  tour_type: string | null;
  category?: string | null;
  subcategory?: string | null;
  custom_tour_id?: string | null;
  tour_order?: number | null;
  charges_extra_pickup_fee?: boolean | null;
  destination: string | null;
  duration: string | number | null;
  adult_price: number | string | null;
  price: number | string | null;
};

type Props = {
  tours: ListingTour[];
  locale: string;
};


export default function TourListingClient({ tours, locale }: Props) {
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("");
  const [tourType, setTourType] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [duration, setDuration] = useState("");

  // Read filters submitted from the Home Page Quick Search.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setSearch(params.get("search") ?? params.get("q") ?? "");
    setDestination(params.get("destination") ?? "");
    setCategory(params.get("category") ?? "");
    setTourType(params.get("type") ?? "");
    setMinPrice(params.get("minPrice") ?? params.get("min_price") ?? "");
    setMaxPrice(params.get("maxPrice") ?? params.get("max_price") ?? "");
    setDuration(params.get("duration") ?? "");
  }, []);

  const isThai = locale === "th";
  const isChinese = locale === "zh";

  const labels = isThai
    ? {
        searchTours: "ค้นหาทัวร์",
        searchPlaceholder: "ค้นหาจากชื่อทัวร์ จุดหมายปลายทาง หรือคำค้น...",
        destination: "จุดหมายปลายทาง",
        allDestinations: "ทุกจุดหมายปลายทาง",
        category: "หมวดหมู่ทัวร์",
        allCategories: "ทุกหมวดหมู่",
        tourType: "ประเภททัวร์",
        allTourTypes: "ทุกประเภททัวร์",
        duration: "ระยะเวลา",
        allDurations: "ทุกระยะเวลา",
        priceRange: "ช่วงราคา (บาท)",
        min: "ต่ำสุด",
        max: "สูงสุด",
        reset: "ล้างตัวกรอง",
        results: "รายการทัวร์",
        found: "พบทัวร์",
        tours: "รายการ",
        noTours: "ไม่พบทัวร์",
        changeFilters: "ลองเปลี่ยนคำค้นหาหรือตัวกรอง",
        clearFilters: "ล้างตัวกรองทั้งหมด",
        noImage: "ไม่มีรูปภาพ",
        durationPrefix: "ระยะเวลา:",
        viewDetails: "ดูรายละเอียด",
      }
    : isChinese
      ? {
          searchTours: "搜索旅游",
          searchPlaceholder: "搜索旅游名称、目的地或关键词...",
          destination: "目的地",
          allDestinations: "所有目的地",
          category: "旅游类别",
          allCategories: "所有类别",
          tourType: "旅游类型",
          allTourTypes: "所有旅游类型",
          duration: "时长",
          allDurations: "所有时长",
          priceRange: "价格范围（泰铢）",
          min: "最低",
          max: "最高",
          reset: "重置筛选",
          results: "旅游结果",
          found: "找到",
          tours: "个旅游项目",
          noTours: "没有找到旅游项目",
          changeFilters: "请尝试更改搜索内容或筛选条件",
          clearFilters: "清除所有筛选",
          noImage: "暂无图片",
          durationPrefix: "时长：",
          viewDetails: "查看详情",
        }
      : {
          searchTours: "Search Tours",
          searchPlaceholder: "Search by tour name, destination or keyword...",
          destination: "Destination",
          allDestinations: "All Destinations",
          category: "Category",
          allCategories: "All Categories",
          tourType: "Tour Type",
          allTourTypes: "All Tour Types",
          duration: "Duration",
          allDurations: "All Durations",
          priceRange: "Price Range (THB)",
          min: "Min",
          max: "Max",
          reset: "Reset Filters",
          results: "Tour Results",
          found: "",
          tours: "tours found",
          noTours: "No tours found",
          changeFilters: "Try changing your search or filters.",
          clearFilters: "Clear Filters",
          noImage: "No image available",
          durationPrefix: "Duration:",
          viewDetails: "View Details",
        };

  const titleOf = (tour: ListingTour) =>
    isThai
      ? tour.title_th || tour.title_en || tour.title_zh || "ไม่มีชื่อทัวร์"
      : isChinese
        ? tour.title_zh || tour.title_en || tour.title_th || "未命名旅游"
        : tour.title_en || tour.title_th || tour.title_zh || "Untitled Tour";

  const descriptionOf = (tour: ListingTour) =>
    isThai
      ? tour.description_th || tour.description_en || ""
      : isChinese
        ? tour.description_zh || tour.description_en || ""
        : tour.description_en || tour.description_th || "";

  const destinations = useMemo(
    () =>
      [...new Set(
        tours
          .map((tour) => tour.destination?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort(),
    [tours]
  );

  const tourTypes = useMemo(
    () =>
      [...new Set(
        tours
          .map((tour) => tour.tour_type?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort(),
    [tours]
  );

  const durations = useMemo(
    () =>
      [...new Set(
        tours
          .map((tour) => tour.duration)
          .filter(
            (value): value is string | number =>
              value !== null && value !== undefined && String(value).trim() !== ""
          )
          .map(String)
      )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [tours]
  );

  const categories = useMemo(
    () =>
      [...new Set(
        tours
          .map((tour) => tour.category?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort(),
    [tours]
  );

  const availableSubcategories = useMemo(
    () =>
      [...new Set(
        tours
          .filter((t) => !category || isCategoryMatch(t.category, category))
          .map((tour) => tour.subcategory?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort(),
    [tours, category]
  );

  const filteredTours = useMemo(() => {
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);

    return tours.filter((tour) => {
      const searchableText = buildSearchableTourText(tour);
      const matchesSearch = matchesSearchQuery(searchableText, search);
      const matchesDestination = isDestinationMatch(tour.destination, destination);
      const matchesType =
        !normalizeText(tourType) ||
        normalizeText(tour.tour_type) === normalizeText(tourType);
      const matchesCategory = isCategoryMatch(tour.category, category);
      const matchesSubcategory =
        !subcategory || normalizeText(tour.subcategory) === normalizeText(subcategory);

      const priceValue = tour.adult_price ?? tour.price;
      const numericPrice =
        priceValue === null || priceValue === ""
          ? NaN
          : Number(String(priceValue).replace(/[,\s฿]/g, ""));
      const price = numericPrice;
      const hasPrice = Number.isFinite(price);

      const matchesMin =
        min === null || (hasPrice && Number.isFinite(price) && price >= min);
      const matchesMax =
        max === null || (hasPrice && Number.isFinite(price) && price <= max);
      const matchesDuration =
        !duration || String(tour.duration ?? "") === duration;

      return (
        matchesSearch &&
        matchesDestination &&
        matchesType &&
        matchesCategory &&
        matchesSubcategory &&
        matchesMin &&
        matchesMax &&
        matchesDuration
      );
    });
  }, [
    tours,
    search,
    destination,
    tourType,
    category,
    subcategory,
    minPrice,
    maxPrice,
    duration,
  ]);

  const resetFilters = () => {
    setSearch("");
    setDestination("");
    setTourType("");
    setCategory("");
    setSubcategory("");
    setMinPrice("");
    setMaxPrice("");
    setDuration("");

    // Remove incoming Home/Search parameters so they do not reapply on reload.
    window.history.replaceState({}, "", window.location.pathname);
  };

  const numberLocale = isChinese ? "zh-CN" : isThai ? "th-TH" : "en-US";

  return (
    <section>
      {/* Category Filter Pills Bar */}
      {categories.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                setSubcategory("");
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                category === ""
                  ? "bg-[#282722] text-[#B89450]"
                  : "bg-white text-[#5D5A50] border border-[#D6CEBD] hover:border-[#B89450] hover:text-[#282722]"
              }`}
            >
              {labels.allCategories}
            </button>
            {categories.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(isSelected ? "" : cat);
                    setSubcategory("");
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                    isSelected
                      ? "bg-[#B89450] text-white"
                      : "bg-white text-[#5D5A50] border border-[#D6CEBD] hover:border-[#B89450] hover:text-[#282722]"
                  }`}
                >
                  {getLocalizedCategory(cat, locale)}
                </button>
              );
            })}
          </div>

          {/* Subcategory Pills */}
          {availableSubcategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <span className="text-[11px] font-semibold text-[#8A8579] mr-1">
                {isThai ? "หมวดหมู่ย่อย:" : isChinese ? "子类别：" : "Subcategory:"}
              </span>
              <button
                type="button"
                onClick={() => setSubcategory("")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  subcategory === ""
                    ? "bg-[#FAF8F3] text-[#B89450] border border-[#B89450]"
                    : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900"
                }`}
              >
                {isThai ? "ทั้งหมด" : isChinese ? "全部" : "All"}
              </button>
              {availableSubcategories.map((sub) => {
                const isSubSelected = subcategory === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubcategory(isSubSelected ? "" : sub)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      isSubSelected
                        ? "bg-[#FAF8F3] text-[#B89450] border border-[#B89450]"
                        : "bg-white text-gray-500 border border-gray-200 hover:text-gray-900"
                    }`}
                  >
                    {getLocalizedSubcategory(sub, locale)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mb-8 rounded-xl border border-[#E4DED1] bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="tour-search"
              className="mb-2 block text-sm font-semibold"
            >
              {labels.searchTours}
            </label>
            <input
              id="tour-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full rounded-xl border border-[#E4DED1] px-4 py-3 text-[#282722] outline-none focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450]"
            />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="shrink-0 rounded-full bg-[#26251F] px-5 py-3 font-semibold text-white transition hover:bg-[#B89450] hover:text-[#22211D]"
          >
            {labels.reset}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="destination" className="mb-2 block text-sm font-medium">
              {labels.destination}
            </label>
            <select
              id="destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="w-full rounded-xl border border-[#E4DED1] bg-white px-3 py-3 text-[#282722] outline-none focus:border-[#B89450]"
            >
              <option value="">{labels.allDestinations}</option>
              {destinations.map((item) => (
                <option key={item} value={item}>
                  {getLocalizedDestination(item, locale)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tour-category" className="mb-2 block text-sm font-medium">
              {labels.category}
            </label>
            <select
              id="tour-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setSubcategory("");
              }}
              className="w-full rounded-xl border border-[#E4DED1] bg-white px-3 py-3 text-[#282722] outline-none focus:border-[#B89450]"
            >
              <option value="">{labels.allCategories}</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {getLocalizedCategory(item, locale)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="duration" className="mb-2 block text-sm font-medium">
              {labels.duration}
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="w-full rounded-xl border border-[#E4DED1] bg-white px-3 py-3 text-[#282722] outline-none focus:border-[#B89450]"
            >
              <option value="">{labels.allDurations}</option>
              {durations.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium">
              {labels.priceRange}
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder={labels.min}
                aria-label={labels.min}
                className="min-w-0 w-1/2 rounded-xl border border-[#E4DED1] px-3 py-3 text-[#282722] outline-none focus:border-[#B89450]"
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder={labels.max}
                aria-label={labels.max}
                className="min-w-0 w-1/2 rounded-xl border border-[#E4DED1] px-3 py-3 text-[#282722] outline-none focus:border-[#B89450]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-forest-deep">
          {labels.results}
        </h2>
        <p className="text-sm text-gray-500" aria-live="polite">
          {isThai
            ? `พบ ${filteredTours.length} รายการ`
            : isChinese
              ? `找到 ${filteredTours.length} 个旅游项目`
              : `${filteredTours.length} ${labels.tours}`}
        </p>
      </div>

      {filteredTours.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-xl font-semibold">{labels.noTours}</h3>
          <p className="mt-2 text-gray-500">{labels.changeFilters}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-xl border px-5 py-2"
          >
            {labels.clearFilters}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => {
            const rawPrice = tour.adult_price ?? tour.price;
            const price =
              rawPrice !== null && rawPrice !== "" && Number.isFinite(Number(rawPrice))
                ? new Intl.NumberFormat(numberLocale).format(Number(rawPrice))
                : null;

            return (
              <article
                key={tour.id}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E4DED1] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <Link href={`/${locale}/tours/${tour.id}`} className="block">
                  <div className="relative h-44 overflow-hidden bg-[#918A73] sm:h-40">
                    <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-[#282722]/85 px-2 py-0.5 text-[10px] font-bold font-mono text-[#D1B16A] shadow-xs backdrop-blur-xs">
                      {getTourDisplayCode(tour, null, tour.id)}
                    </span>
                    {tour.image_url && tour.image_url !== 'NULL' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tour.image_url}
                        alt={titleOf(tour)}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-stone-100 text-[#B89450]">
                        <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {tour.tour_type && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            tour.tour_type === "Ticket Only"
                              ? "bg-emerald-100 text-emerald-800"
                              : tour.tour_type === "Transfer Only"
                              ? "bg-blue-100 text-blue-800"
                              : tour.tour_type === "Private Tour"
                              ? "bg-purple-100 text-purple-800"
                              : tour.tour_type === "Activity Only"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-[#F0EBDD] text-[#282722]"
                          }`}
                        >
                          {tour.tour_type === "Ticket Only" && "🎟 "}
                          {tour.tour_type === "Transfer Only" && "🚐 "}
                          {tour.tour_type === "Private Tour" && "👑 "}
                          {tour.tour_type === "Activity Only" && "⚡ "}
                          {tour.tour_type === "Tour Package" && "🏝 "}
                          {getLocalizedTourType(tour.tour_type, locale)}
                        </span>
                      )}
                      {tour.category && (
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700">
                          {getLocalizedCategory(tour.category, locale)}
                        </span>
                      )}
                      {tour.subcategory && (
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700">
                          {getLocalizedSubcategory(tour.subcategory, locale)}
                        </span>
                      )}
                      {tour.tour_type !== "Ticket Only" && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            !tour.charges_extra_pickup_fee
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {!tour.charges_extra_pickup_fee
                            ? "✓ Pick-up Included"
                            : "Pick-up extra"}
                        </span>
                      )}
                    </div>

                    <h3 className="mb-2 text-base font-bold leading-snug text-[#282722]">
                      {titleOf(tour)}
                    </h3>

                    {tour.destination && (
                      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#B89450]">
                        {tour.destination}
                      </p>
                    )}

                    {tour.duration && (
                      <p className="line-clamp-2 text-xs leading-5 text-[#625F56]">
                        {labels.durationPrefix} {tour.duration}
                      </p>
                    )}

                    {price !== null && (
                      <div className="mt-3 border-t border-[#E8E3D9] pt-3">
                        <p className="text-[9px] font-medium uppercase tracking-wider text-[#8A8579]">{labels.priceRange}</p>
                        <p className="mt-1 text-base font-bold text-[#B89450]">฿{price}</p>
                      </div>
                    )}

                    <span className="mt-4 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#26251F] px-5 py-2 text-xs font-semibold text-white transition duration-300 hover:bg-[#B89450] hover:text-[#22211D]">
                      {labels.viewDetails} →
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
