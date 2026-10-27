import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import BookingClient from "./BookingClient";
import { getTourExtendedData } from "@/lib/tour-extended";

async function BookingForm({
  searchParams,
}: {
  searchParams: {
    tour?: string;
    tour_id?: string;
    price?: string;
    tour_type?: string;
  };
}) {
  const t = await getTranslations("bookingForm");
  const locale = await getLocale();

  const tour = searchParams.tour || "Phuket Paradise";
  const tourId = searchParams.tour_id ? Number(searchParams.tour_id) : undefined;
  const price = searchParams.price || "3500";
  const tourType = searchParams.tour_type;

  let initialExtendedData = null;
  if (tourId) {
    try {
      initialExtendedData = await getTourExtendedData(tourId, tourType);
    } catch (e) {
      console.warn("Could not load initial extended data on server:", e);
    }
  }

  return (
    <BookingClient
      tour={tour}
      tourId={tourId}
      price={price}
      locale={locale}
      initialTourType={tourType}
      initialExtendedData={initialExtendedData}
      labels={{
        title: t("title"),
        fullName: t("fullName"),
        enterName: t("enterName"),
        email: t("email"),
        enterEmail: t("enterEmail"),
        guests: t("guests"),
        travelDate: t("travelDate"),
        confirm: t("confirm"),
      }}
    />
  );
}

export default async function Booking({
  searchParams,
}: {
  searchParams: Promise<{
    tour?: string;
    tour_id?: string;
    price?: string;
    tour_type?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <Suspense>
      <BookingForm searchParams={params} />
    </Suspense>
  );
}
