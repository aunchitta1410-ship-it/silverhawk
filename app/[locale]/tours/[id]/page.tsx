import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TourDetailView from "./TourDetailView";
import { getTourExtendedData } from "@/lib/tour-extended";
import { getSitePolicies } from "@/lib/site-policies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  const { id } = await params;

  const isThai = locale === "th";
  const isChinese = locale === "zh";

  const supabase = await createClient();

  // Tour
  const { data: tour, error: tourError } = await supabase
    .from("tours")
    .select("*")
    .eq("id", id)
    .single();

  if (tourError || !tour) {
    return (
      <main className="min-h-screen bg-[#F0EBDD] px-6 py-20 text-center">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold text-[#17352A]">
            {isChinese ? "未找到旅游项目" : isThai ? "ไม่พบข้อมูลทัวร์" : "Tour Not Found"}
          </h1>
          <p className="mt-3 text-xs text-gray-600">
            {isChinese
              ? "抱歉，找不到此旅游项目。"
              : isThai
              ? "ขออภัย ไม่พบรายการทัวร์ที่คุณค้นหา"
              : "Sorry, this tour could not be found."}
          </p>
          <Link
            href={`/${locale}/tours`}
            className="mt-6 inline-block rounded-xl bg-[#17352A] px-6 py-3 text-xs font-bold text-[#D1B16A]"
          >
            {isChinese ? "返回旅游列表" : isThai ? "กลับหน้ารวมทัวร์" : "Back to Tours"}
          </Link>
        </div>
      </main>
    );
  }

  let tourImageUrl = tour.image_url && tour.image_url !== "NULL" ? tour.image_url.trim() : null;
  if (tourImageUrl && !tourImageUrl.startsWith("http")) {
    const { data: imgData } = supabase.storage
      .from("tour-images")
      .getPublicUrl(tourImageUrl);
    tourImageUrl = imgData?.publicUrl || tourImageUrl;
  }

  // Itinerary
  const { data: itinerary } = await supabase
    .from("tour_itinerary")
    .select("*")
    .eq("tour_id", id)
    .order("sort_order");

  const itineraryWithImages = await Promise.all(
    (itinerary ?? []).map(async (item) => {
      if (!item.image_url) {
        return { ...item, image_signed_url: null };
      }

      if (item.image_url.startsWith("http")) {
        return { ...item, image_signed_url: item.image_url };
      }

      const { data: pubData } = supabase.storage
        .from("tour-itinerary-images")
        .getPublicUrl(item.image_url);

      return {
        ...item,
        image_signed_url: pubData?.publicUrl ?? null,
      };
    })
  );

  // Includes
  const { data: includes } = await supabase
    .from("tour_includes")
    .select("*")
    .eq("tour_id", id)
    .order("sort_order");

  const title = isThai
    ? tour.title_th || tour.title_en
    : isChinese
    ? tour.title_zh || tour.title_en
    : tour.title_en || tour.title_th;

  const description = isThai
    ? tour.description_th || tour.description_en
    : isChinese
    ? tour.description_zh || tour.description_en
    : tour.description_en || tour.description_th;

  // Extended Tour Data (5 tour types, general info, includes, excludes, what to bring, gallery)
  const extendedData = await getTourExtendedData(Number(id), tour.tour_type);
  const sitePolicies = await getSitePolicies();

  // Build Gallery Images (Section 2.6.4)
  const galleryImages: string[] = [];
  if (tourImageUrl) galleryImages.push(tourImageUrl);

  // Add extended gallery images (resolve any Supabase storage paths if needed)
  for (const rawImg of (extendedData.gallery_images || [])) {
    if (!rawImg) continue;
    let url = rawImg.trim();
    if (url && !url.startsWith("http") && !url.startsWith("/")) {
      const { data: pubData } = supabase.storage
        .from("tour-images")
        .getPublicUrl(url);
      url = pubData?.publicUrl || url;
    }
    if (url && !galleryImages.includes(url)) {
      galleryImages.push(url);
    }
  }

  // Add any valid itinerary images to gallery
  itineraryWithImages.forEach((item) => {
    if (item.image_signed_url && !galleryImages.includes(item.image_signed_url)) {
      galleryImages.push(item.image_signed_url);
    }
  });

  return (
    <main className="min-h-screen bg-[#F0EBDD]/60 text-[#282722]">
      <TourDetailView
        tour={tour}
        itinerary={itineraryWithImages}
        includes={includes ?? []}
        galleryImages={galleryImages}
        extendedData={extendedData}
        sitePolicies={sitePolicies}
        locale={locale}
        title={title}
        description={description || ""}
      />
    </main>
  );
}
