
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TourListingClient, {
  type ListingTour,
} from "./TourListingClient";
import { getTourExtendedData } from "@/lib/tour-extended";
import { getLocalizedCategory, getLocalizedTourType } from "@/lib/tour-i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ToursPageProps = {
  searchParams: Promise<{
    type?: string | string[];
    category?: string | string[];
    destination?: string | string[];
    search?: string | string[];
    q?: string | string[];
  }>;
};

export default async function ToursPage({
  searchParams,
}: ToursPageProps) {
  const locale = await getLocale();
  const params = await searchParams;
  const rawType = params.type;
  const rawCat = params.category;

  const selectedType = (
    Array.isArray(rawType) ? rawType[0] : rawType
  )?.trim();
  const selectedCategory = (
    Array.isArray(rawCat) ? rawCat[0] : rawCat
  )?.trim();

  const supabase = await createClient();

  let query = supabase
    .from("tours")
    .select("*")
    .order("id", { ascending: true });

  // Filter by Tour Type if provided
  if (selectedType) {
    query = query.eq("tour_type", selectedType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Tours Error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    return (
      <main className="min-h-screen bg-paper px-6 py-16 text-ink">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-forest-deep">
            {selectedCategory || selectedType || "All Tours"}
          </h1>
          <p className="mt-4">
            Unable to load tours. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const isThai = locale === "th";
  const isChinese = locale === "zh";

  const localizedCategoryTitle = selectedCategory ? getLocalizedCategory(selectedCategory, locale) : "";
  const localizedTypeTitle = selectedType ? getLocalizedTourType(selectedType, locale) : "";
  const pageTitle = localizedCategoryTitle || localizedTypeTitle || (isThai ? "ทัวร์ทั้งหมด" : isChinese ? "所有旅游" : "All Tours");

  const toursWithExtended = await Promise.all(
    (data ?? []).map(async (t) => {
      try {
        const ext = await getTourExtendedData(t.id, t.tour_type);
        return {
          ...t,
          category: ext.category,
          subcategory: ext.subcategory,
          custom_tour_id: ext.custom_tour_id,
          tour_order: ext.tour_order,
          tour_type: ext.tour_type || t.tour_type,
          charges_extra_pickup_fee: ext.charges_extra_pickup_fee,
        };
      } catch {
        return t;
      }
    })
  );

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/${locale}`}
          className="text-sm text-gray-500 hover:text-forest-deep"
        >
          {isThai ? "← หน้าแรก" : isChinese ? "← 首页" : "← Home"}
        </Link>

        <header className="mb-10 mt-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sand">
            {isThai ? "ค้นพบการเดินทางของคุณ" : isChinese ? "开启您的旅程" : "EXPLORE YOUR JOURNEY"}
          </p>

          <h1 className="mt-3 text-4xl font-bold text-forest-deep md:text-5xl">
            {pageTitle}
          </h1>

          <p className="mt-3 text-gray-600">
            {selectedCategory
              ? (isThai ? `ค้นพบประสบการณ์ใน ${localizedCategoryTitle}` : isChinese ? `探索 ${localizedCategoryTitle} 的精彩体验` : `Explore experiences in ${selectedCategory}.`)
              : selectedType
              ? (isThai ? `ค้นพบทัวร์ใน ${localizedTypeTitle}` : isChinese ? `探索 ${localizedTypeTitle} 的精彩项目` : `Explore tours in ${selectedType}.`)
              : (isThai ? "ค้นพบประสบการณ์ท่องเที่ยวที่น่าประทับใจ" : isChinese ? "发现覆盖全类别的精彩旅行体验" : "Discover experiences across all tour categories.")}
          </p>
        </header>

        <TourListingClient
          tours={toursWithExtended as ListingTour[]}
          locale={locale}
        />
      </div>
    </main>
  );
}
