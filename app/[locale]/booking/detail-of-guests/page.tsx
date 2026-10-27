
import { getTranslations } from "next-intl/server";
import DetailOfGuestsForm from "../../../components/DetailOfGuestsForm";
import BookingProgressStepper from "../../../components/BookingProgressStepper";

type Props = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    bookingId?: string;
    tourId?: string;
    tour?: string;
    price?: string;
    totalPrice?: string;
    date?: string;
    adults?: string;
    children?: string;
    infants?: string;
    guests?: string;
    name?: string;
    email?: string;
    childAges?: string;
    childAgeMin?: string;
    childAgeMax?: string;
    infantAgeMin?: string;
    infantAgeMax?: string;
    pickupRequired?: string;
    transferType?: string;
    pickupArea?: string;
    meetingPoint?: string;
    meetingTime?: string;
    pickupNotes?: string;
    hotel?: string;
    roomNo?: string;
    showTime?: string;
    phone?: string;
    ticketTier?: string;
    addonIds?: string;
    addonTotal?: string;
    customBookingData?: string;
    extraDynamicFields?: string;
    pdpaAccepted?: string;
    pdpaVersion?: string;
  }>;
};

export default async function DetailOfGuestsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const query = await searchParams;

  await getTranslations({
    locale,
    namespace: "Booking",
  });

  const adults = Math.max(0, Number(query.adults) || 0);
  const children = Math.max(0, Number(query.children) || 0);
  const infants = Math.max(0, Number(query.infants) || 0);

  const guestCount = Math.min(
    20,
    Math.max(
      1,
      adults + children + infants ||
        Number(query.guests) ||
        1
    )
  );

  const childAges = query.childAges
    ? query.childAges.split(",").map((age) => Number(age))
    : [];

  const bookingInfo = {
    bookingId: query.bookingId ?? "",
    tourId: query.tourId ?? "",
    tour: query.tour ?? "",
    price: query.price ?? "",
    totalPrice: query.totalPrice ?? "",
    date: query.date ?? "",
    adults,
    children,
    infants,
    guests: guestCount,
    name: query.name ?? "",
    email: query.email ?? "",
    childAges,
    childAgeMin: query.childAgeMin ? Number(query.childAgeMin) : 4,
    childAgeMax: query.childAgeMax ? Number(query.childAgeMax) : 11,
    infantAgeMin: query.infantAgeMin ? Number(query.infantAgeMin) : 0,
    infantAgeMax: query.infantAgeMax ? Number(query.infantAgeMax) : 2,
    pickupRequired: query.pickupRequired ?? "",
    transferType: query.transferType ?? "",
    pickupArea: query.pickupArea ?? "",
    meetingPoint: query.meetingPoint ?? "",
    meetingTime: query.meetingTime ?? "",
    pickupNotes: query.pickupNotes ?? "",
    hotel: query.hotel ?? "",
    roomNo: query.roomNo ?? "",
    showTime: query.showTime ?? "",
    phone: query.phone ?? "",
    ticketTier: query.ticketTier ?? "",
    addonIds: query.addonIds ?? "",
    addonTotal: query.addonTotal ?? "0",
    customBookingData: query.customBookingData ?? "",
    extraDynamicFields: query.extraDynamicFields ?? "",
    pdpaAccepted: query.pdpaAccepted ?? "yes",
    pdpaVersion: query.pdpaVersion ?? "v2.4",
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <BookingProgressStepper currentStep={2} locale={locale} />
        
        <DetailOfGuestsForm
          guestCount={guestCount}
          bookingId={query.bookingId}
          bookingInfo={bookingInfo}
        />
      </div>
    </main>
  );
}
