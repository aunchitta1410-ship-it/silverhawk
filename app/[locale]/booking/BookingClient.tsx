"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TourPickupLocation } from "@/lib/tour-pickup";
import type {
  TourExtendedData,
  PricingModel,
  CookingClassDetails,
  ActivityPricingDetails,
  TransferRouteItem,
} from "@/lib/tour-extended-types";
import {
  getRuleItemText,
  DEFAULT_COOKING_CLASS,
  DEFAULT_ACTIVITY_ATV,
  DEFAULT_TRANSFER_ROUTES,
} from "@/lib/tour-extended-types";
import type { SitePolicies } from "@/lib/site-policies-base";
import BookingProgressStepper from "@/app/components/BookingProgressStepper";
import { AdultIcon, ChildIcon, InfantIcon } from "@/app/components/PassengerIcons";

type Props = {
  tour: string;
  tourId?: number;
  price: string;
  locale: string;
  initialTourType?: string;
  initialExtendedData?: TourExtendedData | null;
  labels: {
    title: string;
    fullName: string;
    enterName: string;
    email: string;
    enterEmail: string;
    guests: string;
    travelDate: string;
    confirm: string;
  };
};

type Availability = {
  available_date: string;
  status: "available" | "full" | "closed";
  max_guests: number | null;
  min_guests: number | null;
  notes: string | null;
};

type TourPricing = {
  id: number;
  operated_days: string | null;
  price: number | null;
  child_price: number | null;
  child_age_min: number | null;
  child_age_max: number | null;
  infant_price: number | null;
  infant_age_min: number | null;
  infant_age_max: number | null;
  tour_type?: string | null;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_MAP: Record<string, number> = {
  Sun: 0, Sunday: 0,
  Mon: 1, Monday: 1,
  Tue: 2, Tuesday: 2,
  Wed: 3, Wednesday: 3,
  Thu: 4, Thursday: 4,
  Fri: 5, Friday: 5,
  Sat: 6, Saturday: 6,
};

function normalizeTourType(type?: string | null): string {
  if (!type) return "Tour Package";
  const clean = type.trim();
  const lower = clean.toLowerCase().replace(/[-_]/g, " ");
  if (lower === "ticket only" || lower === "ticket" || lower === "tickets & attractions") return "Ticket Only";
  if (lower === "transfer only" || lower === "transfer" || lower === "transfers & charters") return "Transfer Only";
  if (lower === "private tour" || lower === "private") return "Private Tour";
  if (lower === "activity only" || lower === "activity" || lower === "adventure & eco") return "Activity Only";
  return clean;
}

function money(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function parsePrice(value: string) {
  const parsed = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function BookingClient({
  tour,
  tourId,
  price,
  locale,
  labels,
  initialTourType,
  initialExtendedData,
}: Props) {
  const router = useRouter();
  const isChinese = locale === "zh";
  const isThai = locale === "th";

  const resolvedInitialType = normalizeTourType(initialExtendedData?.tour_type || initialTourType);
  const isInitialTicket = resolvedInitialType === "Ticket Only";

  const [tourData, setTourData] = useState<TourPricing | null>(null);
  const [operatedDays, setOperatedDays] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [bookedGuests, setBookedGuests] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // Extended tour data (5 tour types, categories, extra fees policy, general info)
  const [extendedData, setExtendedData] = useState<TourExtendedData | null>(initialExtendedData || null);

  // Transfer Only specific states
  const [transferPickupPoint, setTransferPickupPoint] = useState("Phuket International Airport (HKT)");
  const [transferDropoffPoint, setTransferDropoffPoint] = useState("");
  const [transferFlightNumber, setTransferFlightNumber] = useState("");
  const [transferPickupTime, setTransferPickupTime] = useState("14:00");
  const [transferLuggageCount, setTransferLuggageCount] = useState(2);
  const [transferVehicleType, setTransferVehicleType] = useState(
    initialExtendedData?.transfer_details?.vehicle_types?.[0] || "VIP Toyota Commuter Van (1-10 pax)"
  );

  // Activity Only specific states
  const [activitySessionSlot, setActivitySessionSlot] = useState(
    initialExtendedData?.activity_details?.session_slots?.[0] || "Morning 09:00 - 11:30"
  );

  // Guest passengers (initialized with defaults 2 Adults, 1 Child matching design)
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(1);
  const [infants, setInfants] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([7]);

  // Customer contact info
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Show time state for Ticket Only tours
  const [selectedShowTime, setSelectedShowTime] = useState(
    initialExtendedData?.ticket_details?.show_times?.[0] || ""
  );

  // Transfer & Pick-up states connected to Tour Management & Supabase
  const [enableTransfer, setEnableTransfer] = useState(!isInitialTicket);
  const [transferOption, setTransferOption] = useState<"no_transfer" | "transfer">(
    isInitialTicket ? "no_transfer" : "transfer"
  );
  const [pickupLocations, setPickupLocations] = useState<TourPickupLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [enableMeetingPoint, setEnableMeetingPoint] = useState(true);
  const [meetingPoint, setMeetingPoint] = useState("Ao Nang Pier");
  const [meetingTime, setMeetingTime] = useState("08:00");
  const [additionalNotes, setAdditionalNotes] = useState("Please arrive at least 15 minutes before departure time.");
  const [hotelName, setHotelName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [pickupHotelAddress, setPickupHotelAddress] = useState("");

  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(true);

  // Dynamic Ticket Types and Optional Add-ons states
  const [selectedTicketTierId, setSelectedTicketTierId] = useState<string>(
    initialExtendedData?.ticket_types?.[0]?.id || ""
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // Specialized Pricing Model States
  const [cookingClassMode, setCookingClassMode] = useState<"join" | "private">("join");
  const [selectedCookProgramId, setSelectedCookProgramId] = useState<string>("cook_prog_a");
  const [cookingParticipants, setCookingParticipants] = useState(2);
  const [nonCookingCompanions, setNonCookingCompanions] = useState(0);
  const [cookingPrivateClassType, setCookingPrivateClassType] = useState<"Half Day" | "Full Day">("Half Day");
  const [cookingPrivateTierId, setCookingPrivateTierId] = useState<string>("priv_hd_1");
  const [extraDishesCount, setExtraDishesCount] = useState(0);

  const [selectedAtvPackageId, setSelectedAtvPackageId] = useState<string>("atv_30m");
  const [atvDrivers, setAtvDrivers] = useState(1);
  const [atvPassengers, setAtvPassengers] = useState(0);
  const [atvChildren, setAtvChildren] = useState(0);
  const [atvSessionSlot, setAtvSessionSlot] = useState("10:30");

  const [selectedRouteGroup, setSelectedRouteGroup] = useState<string>("Phuket - Phi Phi Island");
  const [selectedTimetableRouteId, setSelectedTimetableRouteId] = useState<string>("tr_1");
  const [transferAdults, setTransferAdults] = useState(2);
  const [transferChildren, setTransferChildren] = useState(0);

  // Dynamic Custom Booking Fields & Extra customer fields
  const [dynamicBookingValues, setDynamicBookingValues] = useState<Record<string, string>>({});
  const [extraDynamicFields, setExtraDynamicFields] = useState<
    { id: string; key: string; value: string }[]
  >([]);
  const [newExtraKey, setNewExtraKey] = useState("");
  const [newExtraVal, setNewExtraVal] = useState("");

  // Site Policies & PDPA
  const [sitePolicies, setSitePolicies] = useState<SitePolicies | null>(null);
  const [isPdpaAccepted, setIsPdpaAccepted] = useState(true);
  const [isPdpaModalOpen, setIsPdpaModalOpen] = useState(false);

  const guests = adults + children + infants;

  // Selected pick-up location
  const selectedLocation = pickupLocations.find(
    (loc) => loc.id === selectedLocationId && loc.is_active
  );

  const rawTourType = extendedData?.tour_type || initialExtendedData?.tour_type || tourData?.tour_type || initialTourType || "Tour Package";
  const tourType = normalizeTourType(rawTourType);
  const chargesExtraPickup = Boolean(extendedData?.charges_extra_pickup_fee);
  const effectivePricingModel: PricingModel = extendedData?.pricing_model || "standard";

  // Pricing calculation
  const baseAdultPrice = tourData?.price ?? parsePrice(price);
  const baseChildPrice = tourData?.child_price ?? (baseAdultPrice > 0 ? Math.round(baseAdultPrice * 0.75) : 0);
  const infantPrice = tourData?.infant_price ?? 0;

  // Pickup location fee calculation:
  // If the selected pickup location has adult_price > 0, we compute the fee.
  // If adult_price < baseAdultPrice (or tour is Ticket Only), it's an extra surcharge (+THB 200/350).
  // If adult_price >= baseAdultPrice, it's a zone inclusive rate, so surcharge is adult_price - baseAdultPrice.
  const locAdultPrice = selectedLocation ? Number(selectedLocation.adult_price || 0) : 0;
  const locChildPrice = selectedLocation ? Number(selectedLocation.child_price ?? selectedLocation.adult_price ?? 0) : 0;

  const pickupAdultAddon =
    transferOption === "transfer" && selectedLocation && locAdultPrice > 0
      ? (locAdultPrice < baseAdultPrice || tourType === "Ticket Only" ? locAdultPrice : Math.max(0, locAdultPrice - baseAdultPrice))
      : 0;

  const pickupChildAddon =
    transferOption === "transfer" && selectedLocation && locChildPrice > 0
      ? (locChildPrice < baseChildPrice || tourType === "Ticket Only" ? locChildPrice : Math.max(0, locChildPrice - baseChildPrice))
      : 0;

  const effectiveAdultPrice =
    tourType === "Ticket Only"
      ? baseAdultPrice
      : baseAdultPrice + pickupAdultAddon;

  const effectiveChildPrice =
    tourType === "Ticket Only"
      ? baseChildPrice
      : baseChildPrice + pickupChildAddon;

  // Selected custom ticket tier (if any)
  const selectedTicketTier = (extendedData?.ticket_types || []).find(
    (t) => t.id === selectedTicketTierId
  );
  const baseTicketAdultPrice = selectedTicketTier
    ? (selectedTicketTier.adult_price ?? selectedTicketTier.price)
    : effectiveAdultPrice;
  const baseTicketChildPrice =
    tourType === "Ticket Only" && selectedTicketTier
      ? (selectedTicketTier.child_price ?? selectedTicketTier.adult_price ?? selectedTicketTier.price)
      : effectiveChildPrice;

  // Optional Add-ons calculation
  const selectedAddons = (extendedData?.optional_addons || []).filter((a) =>
    selectedAddonIds.includes(a.id)
  );
  const addonTotal = selectedAddons.reduce((sum, a) => {
    return sum + (a.price_type === "per_person" ? a.price * (adults + children) : a.price);
  }, 0);

  // Ticket Only Transfer Addon calculation
  const ticketTransferRatePerPerson =
    selectedLocation && locAdultPrice > 0
      ? locAdultPrice
      : (extendedData?.ticket_details?.transfer_price ?? 350);
  const ticketTransferChildRate =
    selectedLocation && locChildPrice > 0
      ? locChildPrice
      : ticketTransferRatePerPerson;
  const ticketTransferTotal =
    tourType === "Ticket Only" && transferOption === "transfer"
      ? (adults * ticketTransferRatePerPerson) + (children * ticketTransferChildRate)
      : 0;

  const pickupSurchargeTotal =
    tourType === "Ticket Only"
      ? ticketTransferTotal
      : (adults * pickupAdultAddon) + (children * pickupChildAddon);

  // 1. Cooking Class Calculation
  const cookingPrograms = extendedData?.cooking_class_details?.programs?.length
    ? extendedData.cooking_class_details.programs
    : DEFAULT_COOKING_CLASS.programs;
  const cookingPrivateTiers = extendedData?.cooking_class_details?.private_tiers?.length
    ? extendedData.cooking_class_details.private_tiers
    : DEFAULT_COOKING_CLASS.private_tiers;
  const extraDishPrice = extendedData?.cooking_class_details?.extra_dish_price ?? 1000;

  const activeCookProgram =
    cookingPrograms.find((p) => p.id === selectedCookProgramId) || cookingPrograms[0] || DEFAULT_COOKING_CLASS.programs[0];
  const activePrivateTier =
    cookingPrivateTiers.find((t) => t.id === cookingPrivateTierId) ||
    cookingPrivateTiers.find((t) => t.class_type === cookingPrivateClassType) ||
    cookingPrivateTiers[0] || DEFAULT_COOKING_CLASS.private_tiers[0];

  const cookingTotal =
    cookingClassMode === "join"
      ? (cookingParticipants * activeCookProgram.cooking_price) +
        (nonCookingCompanions * activeCookProgram.non_cooking_price) +
        (extraDishesCount * extraDishPrice) +
        pickupSurchargeTotal +
        addonTotal
      : activePrivateTier.price +
        (extraDishesCount * extraDishPrice) +
        pickupSurchargeTotal +
        addonTotal;

  // 2. Activities & ATV Calculation
  const atvPackages = extendedData?.activity_pricing?.packages?.length
    ? extendedData.activity_pricing.packages
    : DEFAULT_ACTIVITY_ATV.packages;
  const atvSlots = extendedData?.activity_pricing?.session_slots?.length
    ? extendedData.activity_pricing.session_slots
    : (DEFAULT_ACTIVITY_ATV.session_slots || ["08:30", "10:30", "13:00", "15:00", "17:00"]);
  const activeAtvPackage =
    atvPackages.find((p) => p.id === selectedAtvPackageId) || atvPackages[0] || DEFAULT_ACTIVITY_ATV.packages[0];

  const atvTotal =
    (atvDrivers * activeAtvPackage.driver_price) +
    (atvPassengers * activeAtvPackage.passenger_price) +
    (atvChildren * (activeAtvPackage.child_price ?? activeAtvPackage.passenger_price)) +
    pickupSurchargeTotal +
    addonTotal;

  // 3. Transfer Timetable Calculation
  const timetableRoutes = extendedData?.transfer_routes?.length
    ? extendedData.transfer_routes
    : DEFAULT_TRANSFER_ROUTES;
  const activeTimetableRoute =
    timetableRoutes.find((r) => r.id === selectedTimetableRouteId) || timetableRoutes[0] || DEFAULT_TRANSFER_ROUTES[0];

  const transferTimetableTotal =
    (transferAdults * activeTimetableRoute.adult_price) +
    (transferChildren * activeTimetableRoute.child_price) +
    addonTotal;

  const standardTotal =
    adults * baseTicketAdultPrice +
    children * baseTicketChildPrice +
    infants * infantPrice +
    addonTotal +
    ticketTransferTotal;

  const totalPrice =
    effectivePricingModel === "cooking_class"
      ? cookingTotal
      : effectivePricingModel === "activity_atv"
      ? atvTotal
      : effectivePricingModel === "transfer_timetable"
      ? transferTimetableTotal
      : standardTotal;

  // Show times for Ticket Only
  const showTimesList =
    tourType === "Ticket Only" &&
    Array.isArray(extendedData?.ticket_details?.show_times) &&
    extendedData.ticket_details.show_times.length > 0
      ? extendedData.ticket_details.show_times.filter(Boolean)
      : [];

  const availableTicketTiers =
    extendedData?.ticket_types && extendedData.ticket_types.length > 0
      ? extendedData.ticket_types
      : [
          {
            id: "tt_std",
            name_en: "Standard Admission Ticket",
            name_th: "บัตรเข้าชมมาตรฐาน",
            name_zh: "标准入园门票",
            price: effectiveAdultPrice,
            adult_price: effectiveAdultPrice,
            child_price: effectiveChildPrice,
            description_en: "Full park & attraction access during regular operating hours",
          },
          {
            id: "tt_vip",
            name_en: "VIP / Royal Seat Pass",
            name_th: "บัตรที่นั่งวีไอพี / รอยัลซีต",
            name_zh: "VIP贵宾席 / 皇家特等座",
            price: effectiveAdultPrice + 600,
            adult_price: effectiveAdultPrice + 600,
            child_price: effectiveChildPrice + 600,
            description_en: "Prime central stage view with complimentary lounge access",
          },
          {
            id: "tt_fast",
            name_en: "Fast Pass / Priority Access",
            name_th: "บัตรด่วนพิเศษ / ไม่ต้องต่อคิว",
            name_zh: "快速通行证 / 免排队专属通道",
            price: effectiveAdultPrice + 400,
            adult_price: effectiveAdultPrice + 400,
            child_price: effectiveChildPrice + 400,
            description_en: "Skip the regular lines at all major attraction zones",
          },
        ];

  const availableAddons =
    extendedData?.optional_addons && extendedData.optional_addons.length > 0
      ? extendedData.optional_addons
      : [
          {
            id: "addon_locker",
            name_en: "Standard RFID Locker Rental",
            name_th: "เช่าล็อกเกอร์ระบบ RFID มาตรฐาน",
            name_zh: "标准智能RFID电子储物柜租赁",
            price: 150,
            price_type: "per_booking" as const,
            description_en: "Full-day unlimited keyless access using wristband",
          },
          {
            id: "addon_towel",
            name_en: "Fresh Towel Rental",
            name_th: "เช่าผ้าเช็ดตัวผืนใหญ่",
            name_zh: "吸水沙滩浴巾租赁",
            price: 100,
            price_type: "per_person" as const,
            description_en: "Clean sanitised towel for your attraction visit",
          },
          {
            id: "addon_buffet",
            name_en: "International Buffet Dinner Upgrade",
            name_th: "อัปเกรดบุฟเฟต์มื้อค่ำนานาชาติ",
            name_zh: "升级豪华国际自助晚宴",
            price: 600,
            price_type: "per_person" as const,
            description_en: "Delightful world-class dinner buffet included",
          },
        ];

  const currency = "THB";

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      const supabase = createClient();

      // 1. Fetch tour details
      let targetTourId: number | null = tourId || null;

      if (!targetTourId) {
        const { data: foundTour, error: tourError } = await supabase
          .from("tours")
          .select(
            "id, operated_days, price, child_price, child_age_min, child_age_max, infant_price, infant_age_min, infant_age_max, tour_type"
          )
          .eq("title_en", tour)
          .maybeSingle();

        if (!tourError && foundTour) {
          targetTourId = foundTour.id;
          const loadedTour = foundTour as TourPricing;
          setTourData(loadedTour);
          const days = String(loadedTour.operated_days || "")
            .split(",")
            .map((day) => day.trim())
            .filter(Boolean);
          setOperatedDays(days);
        } else {
          // Fallback for default tour
          targetTourId = 1;
        }
      } else {
        const { data: foundTour } = await supabase
          .from("tours")
          .select(
            "id, operated_days, price, child_price, child_age_min, child_age_max, infant_price, infant_age_min, infant_age_max, tour_type"
          )
          .eq("id", targetTourId)
          .maybeSingle();

        if (foundTour) {
          const loadedTour = foundTour as TourPricing;
          setTourData(loadedTour);
          const days = String(loadedTour.operated_days || "")
            .split(",")
            .map((day) => day.trim())
            .filter(Boolean);
          setOperatedDays(days);
        }
      }

      // 2. Load Extended Tour Data (5 tour types, extra fee policy, not recommended, details)
      if (targetTourId) {
        try {
          const extRes = await fetch(`/api/tours/${targetTourId}/extended`);
          const extJson = await extRes.json();
          if (extRes.ok && extJson.success && extJson.data) {
            setExtendedData(extJson.data);
            if (extJson.data.transfer_details?.vehicle_types?.[0]) {
              setTransferVehicleType(extJson.data.transfer_details.vehicle_types[0]);
            }
            if (extJson.data.activity_details?.session_slots?.[0]) {
              setActivitySessionSlot(extJson.data.activity_details.session_slots[0]);
            }
            if (extJson.data.tour_type === "Ticket Only") {
              setTransferOption("no_transfer");
              const initialShowTime = extJson.data.ticket_details?.show_times?.[0] || "";
              setSelectedShowTime(initialShowTime);
              if (extJson.data.ticket_types?.[0]?.id) {
                setSelectedTicketTierId(extJson.data.ticket_types[0].id);
              }
            }
          }
        } catch (err) {
          console.warn("Could not load extended tour details:", err);
        }
      }

      // 3. Load Transfer & Pick-up options for this tour from Supabase / API
      if (targetTourId) {
        try {
          const pickupRes = await fetch(`/api/tours/${targetTourId}/pickup`);
          const pickupJson = await pickupRes.json();
          if (pickupRes.ok && pickupJson.success) {
            setEnableTransfer(pickupJson.enable_transfer ?? true);
            setEnableMeetingPoint(pickupJson.enable_meeting_point !== false && Boolean(pickupJson.meeting_point));
            setMeetingPoint(pickupJson.meeting_point || "Ao Nang Pier");
            setMeetingTime(pickupJson.meeting_time || "08:00");
            setAdditionalNotes(
              pickupJson.additional_notes ||
                "Please arrive at least 15 minutes before departure time."
            );

            const activeLocs: TourPickupLocation[] = pickupJson.pickup_locations || [];
            setPickupLocations(activeLocs);

            if (activeLocs.length > 0) {
              setSelectedLocationId(activeLocs[0].id);
              setTransferOption("transfer");
            } else if (pickupJson.enable_transfer === false) {
              setTransferOption("no_transfer");
            }
          }
        } catch (err) {
          console.warn("Could not load tour pickup details:", err);
        }
      }

      // 4. Load availability
      if (targetTourId) {
        const { data: availabilityData } = await supabase
          .from("tour_availability")
          .select("available_date, status, max_guests, min_guests, notes")
          .eq("tour_id", targetTourId);

        const availabilityMap: Record<string, Availability> = {};
        (availabilityData || []).forEach((item: Availability) => {
          availabilityMap[item.available_date] = item;
        });

        const { data: bookingData } = await supabase.rpc("get_booked_guests", {
          p_tour_id: targetTourId,
        });

        const bookingMap: Record<string, number> = {};
        (bookingData || []).forEach(
          (item: { travel_date: string; booked_guests: number | null }) => {
            bookingMap[item.travel_date] = Number(item.booked_guests || 0);
          }
        );

        // 5. Load Site Policies & PDPA
        try {
          const polRes = await fetch("/api/policies");
          const polJson = await polRes.json();
          if (!cancelled && polRes.ok && polJson.policies) {
            setSitePolicies(polJson.policies);
          }
        } catch (polErr) {
          console.warn("Could not load site policies:", polErr);
        }

        if (!cancelled) {
          setAvailability(availabilityMap);
          setBookedGuests(bookingMap);
          setLoading(false);
        }
      } else {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [tour]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function dateValue(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function isPast(date: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${date}T00:00:00`) < today;
  }

  function statusForDate(date: string): string {
    const override = availability[date];
    if (override) {
      const remaining =
        override.max_guests == null
          ? null
          : override.max_guests - (bookedGuests[date] || 0);
      if (remaining !== null && remaining <= 0) return "full";
      return override.status;
    }

    // Specific show dates (if configured in ticket details)
    if (
      tourType === "Ticket Only" &&
      Array.isArray(extendedData?.ticket_details?.show_dates) &&
      extendedData.ticket_details.show_dates.length > 0
    ) {
      if (!extendedData.ticket_details.show_dates.includes(date)) return "closed";
    }

    // If no operated days configured at all, default to available
    if (!operatedDays || operatedDays.length === 0) return "available";

    const opStr = operatedDays.join(" ").toLowerCase();
    if (
      opStr.includes("daily") ||
      opStr.includes("everyday") ||
      opStr.includes("every day") ||
      opStr.includes("all day")
    ) {
      const weekday = new Date(`${date}T00:00:00`).getDay();
      if ((opStr.includes("except tuesday") || opStr.includes("except tue")) && weekday === 2) return "closed";
      if ((opStr.includes("except wednesday") || opStr.includes("except wed")) && weekday === 3) return "closed";
      if ((opStr.includes("except monday") || opStr.includes("except mon")) && weekday === 1) return "closed";
      if ((opStr.includes("except thursday") || opStr.includes("except thu")) && weekday === 4) return "closed";
      if ((opStr.includes("except friday") || opStr.includes("except fri")) && weekday === 5) return "closed";
      if ((opStr.includes("except saturday") || opStr.includes("except sat")) && weekday === 6) return "closed";
      if ((opStr.includes("except sunday") || opStr.includes("except sun")) && weekday === 0) return "closed";
      return "available";
    }

    const weekday = new Date(`${date}T00:00:00`).getDay();
    const DAY_ABBR = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const targetAbbr = DAY_ABBR[weekday];

    const isMatch = operatedDays.some((day) => {
      const d = day.trim().toLowerCase();
      if (DAY_MAP[day] === weekday) return true;
      if (d.startsWith(targetAbbr)) return true;
      return false;
    });

    return isMatch ? "available" : "closed";
  }

  function isAvailable(date: string) {
    return !isPast(date) && statusForDate(date) === "available";
  }

  // Auto-select nearest available date when loading finishes and no date is chosen yet
  useEffect(() => {
    if (!selectedDate && !loading) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      for (let i = 0; i < 30; i++) {
        const check = new Date(tomorrow);
        check.setDate(tomorrow.getDate() + i);
        const y = check.getFullYear();
        const m = String(check.getMonth() + 1).padStart(2, "0");
        const d = String(check.getDate()).padStart(2, "0");
        const dStr = `${y}-${m}-${d}`;
        if (statusForDate(dStr) === "available") {
          setSelectedDate(dStr);
          break;
        }
      }
    }
  }, [operatedDays, availability, tourType, loading, selectedDate]);

  const selectedAvailability = selectedDate ? availability[selectedDate] : undefined;
  const availableSeats =
    selectedAvailability?.max_guests == null
      ? null
      : Math.max(0, selectedAvailability.max_guests - (bookedGuests[selectedDate] || 0));
  const guestLimit = availableSeats ?? 20;

  function updateGuestCount(type: "adults" | "children" | "infants", delta: number) {
    if (type === "adults") {
      const next = Math.max(1, adults + delta);
      if (next + children + infants <= guestLimit) setAdults(next);
    } else if (type === "children") {
      const next = Math.max(0, children + delta);
      if (adults + next + infants <= guestLimit) {
        setChildren(next);
        setChildAges((prev) =>
          Array.from({ length: next }, (_, i) => prev[i] ?? 7)
        );
      }
    } else if (type === "infants") {
      const next = Math.max(0, infants + delta);
      if (adults + children + next <= guestLimit) setInfants(next);
    }
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDateError("");

    if (!selectedDate) {
      return setDateError("Please select a travel date on the calendar.");
    }
    if (tourType === "Ticket Only" && !selectedShowTime && showTimesList.length > 0) {
      return setDateError("Please select a show time.");
    }
    if (!customerName.trim() || !customerEmail.trim()) {
      return setDateError("Please enter your name and email.");
    }
    if (guests < 1) {
      return setDateError(tourType === "Ticket Only" ? "Please select at least 1 ticket." : "Please select at least 1 passenger.");
    }
    if (!isPdpaAccepted) {
      return setDateError(isChinese ? "请勾选同意个人数据保护（PDPA）条款以继续预订。" : isThai ? "กรุณายอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) เพื่อดำเนินการจอง" : "Please accept the PDPA privacy policy to continue.");
    }

    let fullPickupNotes = "";
    let pickupArea = "";
    let transferType = "Hotel pick-up";
    let isPickupRequired = "no";
    let bookingAdults = adults;
    let bookingChildren = children;
    let bookingInfants = infants;

    if (effectivePricingModel === "cooking_class") {
      isPickupRequired = transferOption === "transfer" ? "yes" : "no";
      if (cookingClassMode === "join") {
        bookingAdults = cookingParticipants;
        bookingChildren = nonCookingCompanions;
        bookingInfants = 0;
        transferType = `Cooking Class: ${activeCookProgram.name} (${cookingParticipants} Cooking @ ฿${activeCookProgram.cooking_price.toLocaleString()}${nonCookingCompanions > 0 ? `, ${nonCookingCompanions} Non-Cooking @ ฿${activeCookProgram.non_cooking_price.toLocaleString()}` : ""}${extraDishesCount > 0 ? `, ${extraDishesCount} extra dishes` : ""})`;
      } else {
        bookingAdults = activePrivateTier.min_pax;
        bookingChildren = 0;
        bookingInfants = 0;
        transferType = `Private Cooking Class: ${activePrivateTier.class_type} (${activePrivateTier.tier_label}) - ฿${activePrivateTier.price.toLocaleString()}${extraDishesCount > 0 ? ` + ${extraDishesCount} extra dishes` : ""}`;
      }
      pickupArea = transferOption === "transfer" ? (selectedLocation?.location_name || hotelName || pickupHotelAddress) : "Direct";
      fullPickupNotes = [
        `Class: ${cookingClassMode === "join" ? activeCookProgram.name : `${activePrivateTier.class_type} (${activePrivateTier.tier_label})`}`,
        extraDishesCount > 0 ? `Extra Dishes: ${extraDishesCount}` : "",
        hotelName.trim() ? `Hotel: ${hotelName.trim()}` : "",
        roomNumber.trim() ? `Room: ${roomNumber.trim()}` : "",
      ].filter(Boolean).join(" | ");
    } else if (effectivePricingModel === "activity_atv") {
      isPickupRequired = transferOption === "transfer" ? "yes" : "no";
      bookingAdults = atvDrivers;
      bookingChildren = atvPassengers;
      bookingInfants = atvChildren;
      transferType = `ATV Adventure: ${activeAtvPackage.name} (${atvDrivers} Drivers, ${atvPassengers} Passengers, ${atvChildren} Children) | Slot: ${atvSessionSlot}`;
      pickupArea = transferOption === "transfer" ? (selectedLocation?.location_name || hotelName || pickupHotelAddress) : "Direct";
      fullPickupNotes = [
        `Package: ${activeAtvPackage.name}`,
        `Slot: ${atvSessionSlot}`,
        hotelName.trim() ? `Hotel: ${hotelName.trim()}` : "",
        roomNumber.trim() ? `Room: ${roomNumber.trim()}` : "",
      ].filter(Boolean).join(" | ");
    } else if (effectivePricingModel === "transfer_timetable") {
      isPickupRequired = "yes";
      bookingAdults = transferAdults;
      bookingChildren = transferChildren;
      bookingInfants = 0;
      transferType = `Speedboat Transfer: ${activeTimetableRoute.schedule_route} (${activeTimetableRoute.departure_pier} ${activeTimetableRoute.departure_time} hrs -> ${activeTimetableRoute.arrival_pier} ${activeTimetableRoute.arrival_time} hrs)`;
      pickupArea = activeTimetableRoute.departure_pier;
      fullPickupNotes = `Route: ${activeTimetableRoute.schedule_route} | Departure: ${activeTimetableRoute.departure_pier} at ${activeTimetableRoute.departure_time} hrs | Arrival: ${activeTimetableRoute.arrival_pier} at ${activeTimetableRoute.arrival_time} hrs | Hotel: ${hotelName.trim()}`;
    } else if (tourType === "Ticket Only") {
      isPickupRequired = transferOption === "transfer" ? "yes" : "no";
      transferType =
        transferOption === "transfer"
          ? `Ticket Admission + Hotel Transfer${selectedShowTime ? ` (Show: ${selectedShowTime})` : ""}`
          : `Ticket Only Self Admission${selectedShowTime ? ` (Show: ${selectedShowTime})` : ""}`;
      pickupArea = transferOption === "transfer" ? (selectedLocation?.location_name || hotelName || pickupHotelAddress) : "Venue Direct";
      fullPickupNotes = [
        selectedShowTime ? `Show Time: ${selectedShowTime}` : "",
        `Venue: ${extendedData?.ticket_details?.venue_address || "Phuket Attraction"}`,
        `Redemption: ${extendedData?.ticket_details?.redemption_point || "Digital e-voucher at Ticket Gate"}`,
        transferOption === "transfer" && hotelName.trim() ? `Hotel: ${hotelName.trim()}` : "",
        transferOption === "transfer" && roomNumber.trim() ? `Room: ${roomNumber.trim()}` : "",
        transferOption === "transfer" && pickupHotelAddress.trim() ? pickupHotelAddress.trim() : "",
      ]
        .filter(Boolean)
        .join(" | ");
    } else if (tourType === "Transfer Only") {
      transferType = `Transfer Service (${transferVehicleType})`;
      isPickupRequired = "yes";
      pickupArea = transferPickupPoint;
      fullPickupNotes = `Pickup: ${transferPickupPoint} | Dropoff: ${transferDropoffPoint || "Hotel Lobby"} | Flight: ${transferFlightNumber || "N/A"} | Pickup Time: ${transferPickupTime} | Luggage: ${transferLuggageCount} bags`;
    } else {
      isPickupRequired = transferOption === "transfer" ? "yes" : "no";
      transferType = transferOption === "transfer" ? "Hotel pick-up" : "No Transfer";
      if (tourType === "Activity Only") {
        transferType = transferOption === "transfer" ? `Activity Pick-up (${activitySessionSlot})` : `Activity Direct (${activitySessionSlot})`;
      }
      pickupArea = transferOption === "transfer" ? selectedLocation?.location_name || hotelName : "";
      fullPickupNotes =
        transferOption === "transfer"
          ? [
              tourType === "Activity Only" ? `Slot: ${activitySessionSlot}` : "",
              hotelName.trim() ? `Hotel: ${hotelName.trim()}` : "",
              roomNumber.trim() ? `Room: ${roomNumber.trim()}` : "",
              pickupHotelAddress.trim(),
            ]
              .filter(Boolean)
              .join(" - ")
          : additionalNotes;
    }

    const calculatedGuests = bookingAdults + bookingChildren + bookingInfants;

    const params = new URLSearchParams({
      tourId: String(tourData?.id || tourId || 1),
      tour,
      tourType,
      pricingModel: effectivePricingModel,
      price: String(totalPrice),
      basePrice: String(baseTicketAdultPrice),
      childPrice: String(baseTicketChildPrice),
      infantPrice: String(infantPrice),
      date: selectedDate,
      showTime: selectedShowTime,
      phone: customerPhone.trim(),
      adults: String(bookingAdults),
      children: String(bookingChildren),
      infants: String(bookingInfants),
      guests: String(calculatedGuests),
      childAges: childAges.join(","),
      name: customerName.trim(),
      email: customerEmail.trim(),
      hotel: hotelName.trim() || transferDropoffPoint.trim(),
      roomNo: roomNumber.trim(),
      pickupRequired: isPickupRequired,
      transferType,
      pickupArea,
      pickupLocationId: String(selectedLocation?.id || ""),
      pickupLocationName: selectedLocation?.location_name || "",
      pickupLocationPrice: String(locAdultPrice),
      pickupTransferFee: String(pickupSurchargeTotal),
      meetingPoint: transferOption === "no_transfer" && enableMeetingPoint ? meetingPoint : "",
      meetingTime: transferOption === "no_transfer" && enableMeetingPoint ? meetingTime : "",
      pickupNotes: fullPickupNotes,
      addonIds: selectedAddonIds.join(","),
      addonTotal: String(addonTotal),
      customBookingData: JSON.stringify(dynamicBookingValues),
      extraDynamicFields: JSON.stringify(extraDynamicFields),
      ticketTier: selectedTicketTier ? selectedTicketTier.name_en : "",
      pdpaAccepted: isPdpaAccepted ? "yes" : "no",
      pdpaVersion: sitePolicies?.pdpa?.version || "v2.4",
      pickupPriceStatus:
        selectedLocation && Number(selectedLocation.adult_price || 0) > 0
          ? `Pick-up: ${selectedLocation.location_name} (+THB ${pickupSurchargeTotal.toLocaleString()})`
          : transferOption === "transfer"
          ? (selectedLocation?.location_name ? `Pick-up: ${selectedLocation.location_name} (Included)` : "Hotel pick-up (Included)")
          : "No Transfer (Self Arrival)",
    });

    if (effectivePricingModel === "cooking_class") {
      params.set("cookingClassMode", cookingClassMode);
      params.set("cookingProgram", activeCookProgram.name);
      params.set("extraDishes", String(extraDishesCount));
    } else if (effectivePricingModel === "activity_atv") {
      params.set("atvPackage", activeAtvPackage.name);
      params.set("atvSlot", atvSessionSlot);
    } else if (effectivePricingModel === "transfer_timetable") {
      params.set("timetableRoute", activeTimetableRoute.schedule_route);
      params.set("timetableSchedule", `${activeTimetableRoute.departure_pier} (${activeTimetableRoute.departure_time} hrs) -> ${activeTimetableRoute.arrival_pier} (${activeTimetableRoute.arrival_time} hrs)`);
    }

    if (tourData?.child_age_min != null) params.set("childAgeMin", String(tourData.child_age_min));
    if (tourData?.child_age_max != null) params.set("childAgeMax", String(tourData.child_age_max));
    if (tourData?.infant_age_min != null) params.set("infantAgeMin", String(tourData.infant_age_min));
    if (tourData?.infant_age_max != null) params.set("infantAgeMax", String(tourData.infant_age_max));

    router.push(`/${locale}/booking/detail-of-guests?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[#F0EBDD] text-[#282722] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Booking Progress Stepper */}
        <div className="mb-4">
          <BookingProgressStepper currentStep={1} locale={locale} />
        </div>

        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center justify-between border-b border-[#B89450]/30 pb-3">
          <div className="flex items-center gap-2 text-xs text-[#5D5A50]">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1 font-semibold text-[#282722] hover:text-[#B89450] transition-colors"
            >
              <span>‹</span>
              <span>Back</span>
            </button>
            <span className="mx-2 text-[#B89450]/50">|</span>
            <span className="font-serif font-bold text-[#282722] tracking-wide text-sm">
              Booking Details
            </span>
          </div>
        </div>

        <form onSubmit={handleContinue}>
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_420px]">
            {/* LEFT COLUMN: Travel Date Calendar & Customer Information */}
            <div className="space-y-6">
              {/* Tour Header Banner */}
              <div className="rounded-2xl border border-[#B89450]/35 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#B89450]">
                    Silver Hawk Luxury Tours
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      tourType === "Ticket Only"
                        ? "bg-emerald-100 text-emerald-800"
                        : tourType === "Transfer Only"
                        ? "bg-blue-100 text-blue-800"
                        : tourType === "Private Tour"
                        ? "bg-purple-100 text-purple-800"
                        : tourType === "Activity Only"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {tourType === "Ticket Only" && "🎟 "}
                    {tourType === "Transfer Only" && "🚐 "}
                    {tourType === "Private Tour" && "👑 "}
                    {tourType === "Activity Only" && "⚡ "}
                    {tourType === "Tour Package" && "🏝 "}
                    {tourType}
                  </span>
                  {extendedData?.category &&
                    extendedData.category.toLowerCase().replace(/[-_]/g, " ") !== tourType.toLowerCase().replace(/[-_]/g, " ") && (
                      <span className="text-[10px] font-medium text-[#736E62]">
                        • {extendedData.category}
                      </span>
                    )}
                  {extendedData?.subcategory && (
                    <span className="text-[10px] font-medium text-[#736E62]">
                      • {extendedData.subcategory}
                    </span>
                  )}
                  {tourType !== "Ticket Only" && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        !chargesExtraPickup
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {!chargesExtraPickup
                        ? "✓ Hotel Pick-up Included"
                        : "Pick-up Extra Fee Applies"}
                    </span>
                  )}
                </div>
                <h1 className="mt-1 font-serif text-3xl font-bold text-[#282722] sm:text-4xl">
                  {tour}
                </h1>
                <p className="mt-2 text-xs text-[#5D5A50]">
                  {tourType === "Ticket Only"
                    ? "Purchase admission tickets with instant mobile confirmation. No hotel transfer required."
                    : tourType === "Transfer Only"
                    ? "Book reliable private hotel or airport transfer in Phuket with professional drivers."
                    : tourType === "Activity Only"
                    ? "Book individual activity session with complete equipment and instructor provided."
                    : isChinese
                    ? "请在下方填写您的预订与接送详情。"
                    : "Complete your booking and transfer details below."}
                </p>
              </div>

              {/* Travel Date Section */}
              <section className="rounded-2xl border border-[#B89450]/35 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                      ⊕
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#282722]">
                      {tourType === "Ticket Only" ? (isChinese ? "演出日期" : isThai ? "วันที่เข้าชม" : "Show Date") : (labels.travelDate || "Travel Date")}
                    </h2>
                  </div>
                </div>

                {operatedDays && operatedDays.length > 0 && (
                  <div className="mb-3.5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900">
                    <span className="font-bold text-emerald-950 flex items-center gap-1">
                      <span>📅</span>
                      <span>
                        {tourType === "Ticket Only"
                          ? (isChinese ? "演出运营日:" : isThai ? "เปิดการแสดงเฉพาะวัน:" : "Operated Show Days:")
                          : (isChinese ? "发团运营日:" : isThai ? "เปิดให้บริการเฉพาะวัน:" : "Operated Days:")}
                      </span>
                    </span>
                    <span className="font-semibold text-emerald-800">
                      {operatedDays.join(", ")}
                    </span>
                  </div>
                )}

                <div className="mb-4 flex items-center justify-between rounded-xl border border-[#B89450]/25 bg-[#FAF8F3] p-2.5">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#282722] hover:bg-[#EAE4D5] transition-colors"
                  >
                    ← Prev
                  </button>
                  <h3 className="font-bold text-[#282722] text-sm">
                    {MONTHS[month]} {year}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#282722] hover:bg-[#EAE4D5] transition-colors"
                  >
                    Next →
                  </button>
                </div>

                {loading ? (
                  <p className="py-8 text-center text-xs text-[#5D5A50]">
                    Loading dates...
                  </p>
                ) : (
                  <>
                    <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-[#8D846D]">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {calendarDays.map((day, index) => {
                        if (day === null) return <div key={`blank-${index}`} />;
                        const date = dateValue(day);
                        const available = isAvailable(date);
                        const selected = selectedDate === date;

                        let classes =
                          "aspect-square rounded-xl text-xs font-medium transition flex flex-col items-center justify-center ";
                        if (selected) {
                          classes +=
                            "bg-gradient-to-r from-[#D1B16A] to-[#B89450] text-[#282722] font-bold shadow-md shadow-[#B89450]/30 scale-105";
                        } else if (available) {
                          classes +=
                            "border border-[#D6CEBD] bg-white text-[#282722] font-semibold hover:border-[#B89450] hover:bg-[#FAF8F3]";
                        } else {
                          classes +=
                            "cursor-not-allowed border border-transparent text-gray-400 bg-gray-100/70";
                        }

                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={!available}
                            onClick={() => {
                              setSelectedDate(date);
                              setDateError("");
                            }}
                            className={classes}
                          >
                            <span>{day}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {selectedDate && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-[#B89450]/40 bg-[#FAF8F3] p-3 text-xs text-[#282722]">
                    <span className="font-medium text-[#5D5A50]">
                      {tourType === "Ticket Only"
                        ? isChinese
                          ? "已选入园/演出日期:"
                          : isThai
                          ? "วันที่เลือกเข้าชม:"
                          : "Selected Show Date:"
                        : isChinese
                        ? "已选旅行日期:"
                        : isThai
                        ? "วันที่เลือกเดินทาง:"
                        : "Selected Date:"}
                    </span>
                    <strong className="font-mono text-sm font-bold text-[#B89450]">
                      {selectedDate}
                    </strong>
                  </div>
                )}
              </section>

              {/* Show Time Section (Only if tour is Ticket Only and has show times configured) */}
              {tourType === "Ticket Only" && showTimesList.length > 0 && (
                <section className="rounded-2xl border border-[#B89450]/35 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                        ⊕
                      </span>
                      <h2 className="font-serif text-lg font-bold text-[#282722]">
                        {isChinese ? "演出场次时间" : isThai ? "รอบเวลาการแสดง" : "Show time :"}
                      </h2>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {showTimesList.length} {showTimesList.length === 1 ? "Session Available" : "Sessions Available"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {showTimesList.map((timeSlot) => {
                      const isSelected = selectedShowTime === timeSlot;
                      return (
                        <button
                          key={timeSlot}
                          type="button"
                          onClick={() => {
                            setSelectedShowTime(timeSlot);
                            setDateError("");
                          }}
                          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition ${
                            isSelected
                              ? "border-[#B89450] bg-[#FAF8F3] ring-2 ring-[#B89450] shadow-sm"
                              : "border-[#D6CEBD] bg-white hover:border-[#B89450]/60 hover:bg-[#FAF8F3]/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                isSelected ? "border-[#B89450]" : "border-gray-400"
                              }`}
                            >
                              {isSelected && <div className="h-2 w-2 rounded-full bg-[#B89450]" />}
                            </div>
                            <span className="text-xs font-bold text-[#17352A] font-mono">
                              {timeSlot}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 pl-6">
                            Instant mobile confirmation
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedShowTime && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                      <span className="font-medium">Selected Show Slot:</span>
                      <strong className="font-mono text-sm font-bold text-emerald-900">
                        🕒 {selectedShowTime}
                      </strong>
                    </div>
                  )}
                </section>
              )}

              {/* Customer Information */}
              <section className="rounded-2xl border border-[#B89450]/35 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-serif text-lg font-bold text-[#282722]">
                  Customer Information
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#282722]">
                      {labels.fullName || "Full Name"} *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={labels.enterName || "John Doe"}
                      required
                      className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3.5 py-2.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#282722]">
                      {labels.email || "Email"} *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={labels.enterEmail || "john@example.com"}
                      required
                      className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3.5 py-2.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-[#282722]">
                      Phone Number / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+66 81 234 5678"
                      className="w-full rounded-xl border border-[#D6CEBD] bg-white px-3.5 py-2.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FAF8F3] p-2.5 text-[11px] text-[#5D5A50] border border-[#B89450]/20">
                  <span className="text-[#B89450] font-bold">ℹ️</span>
                  <span>{isChinese ? "您的姓名与电子邮箱将关联到预订凭证与行程确认单。" : isThai ? "ชื่อและอีเมลของคุณจะเชื่อมโยงกับเอกสารการจองและบัตรโดยสาร" : "Your name and email will be linked to your booking record, boarding voucher, and customer profile."}</span>
                </div>
              </section>

              {/* Risk Information & Cancellation Policy */}
              <section className="rounded-2xl border border-[#B89450]/35 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <span className="text-base text-amber-600">⚠️</span>
                  <h2 className="font-serif text-lg font-bold text-[#282722]">
                    Risk Information & Cancellation Policy
                  </h2>
                </div>

                <div className="mt-4 space-y-4 text-xs leading-relaxed text-[#4A473E]">
                  <div>
                    <h3 className="font-bold text-[#17352A] flex items-center gap-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      When the Operator / Admin May Cancel Your Tour
                    </h3>
                    <p className="mt-1 text-gray-600">
                      Silver Hawk prioritizes passenger safety above all. The tour operator/admin reserves the right to cancel or postpone a tour under the following conditions:
                    </p>
                    <ul className="mt-2 space-y-1.5 list-disc pl-5 text-gray-700">
                      <li>
                        <strong>Severe Weather & Marine Warnings:</strong> Monsoon storms, high sea swell, gale force winds, or official Marine Department red-flag advisories making Andaman navigation unsafe.
                      </li>
                      <li>
                        <strong>Minimum Quota Requirement:</strong> If the tour does not meet the minimum passenger headcount required for operation.
                      </li>
                      <li>
                        <strong>Government & National Park Orders:</strong> Unscheduled closures of Maya Bay, Similan, or marine sanctuaries ordered by the Department of National Parks (DNP).
                      </li>
                      <li>
                        <strong>Maritime Technical Inspection:</strong> Unforeseen mechanical or harbor safety checks requiring vessel grounding.
                      </li>
                    </ul>
                    <div className="mt-2.5 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900">
                      <strong>Operator Cancellation Guarantee:</strong> If the admin cancels your tour for any of the above reasons, you will receive an automatic notification email stating the exact reason, and you are entitled to a <strong>100% full refund</strong> or a free reschedule.
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <h3 className="font-bold text-[#17352A] flex items-center gap-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#B89450]" />
                      Customer Cancellation & Refund Terms
                    </h3>
                    <ul className="mt-1.5 space-y-1 list-disc pl-5 text-gray-700">
                      <li>
                        <strong>Free Cancellation:</strong> You may cancel with full refund up to 24 hours prior to the scheduled departure date.
                      </li>
                      <li>
                        <strong>Within 24 Hours / Boarding Voucher:</strong> Cancellations made within 24 hours of travel, no-shows, or after an official Tour Voucher has been issued are strictly non-refundable.
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <h3 className="font-bold text-[#17352A] flex items-center gap-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Passenger Health & Safety Advisory
                    </h3>
                    <p className="mt-1 text-gray-600">
                      Speedboat tours are not recommended for pregnant women, infants under 1 year old, or travelers with severe back/heart conditions. Life jackets must be worn at all times while aboard.
                    </p>
                    {extendedData?.not_recommended && extendedData.not_recommended.length > 0 && (
                      <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                        <p className="text-[11px] font-bold text-amber-900 mb-1.5">
                          {isChinese
                            ? "安全提示与健康限制："
                            : isThai
                            ? "คำแนะนำด้านความปลอดภัยและข้อจำกัดด้านสุขภาพ:"
                            : "Are Not Recommended For (Medical & Safety Guidelines):"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {extendedData.not_recommended.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-md bg-white border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-900 shadow-2xs"
                            >
                              ⚠ {getRuleItemText(item, locale)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: The 3-Step Pick-up Section */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#B89450]/35 bg-white p-6 shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-xl font-bold text-[#282722]">
                    {tour}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#5D5A50]">
                  Complete your booking details below.
                </p>

                {/* Dynamic Configuration based on Specialized Pricing Models */}
                {effectivePricingModel === "cooking_class" ? (
                  /* 1. COOKING CLASS (PICTURE 1: JOIN & PRIVATE TIERS) */
                  <div className="space-y-6">
                    {/* Class Mode Tabs (Join vs Private) */}
                    <div className="mt-5 border-t border-[#B89450]/20 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                          🍳
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Choose Cooking Class Experience
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCookingClassMode("join")}
                          className={`flex flex-col items-center justify-center rounded-xl border p-3 transition cursor-pointer ${
                            cookingClassMode === "join"
                              ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white hover:border-[#B89450]/50"
                          }`}
                        >
                          <span className="text-xs font-bold text-[#17352A]">Join Cooking Class</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">Program A & B (Group Class)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCookingClassMode("private")}
                          className={`flex flex-col items-center justify-center rounded-xl border p-3 transition cursor-pointer ${
                            cookingClassMode === "private"
                              ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white hover:border-[#B89450]/50"
                          }`}
                        >
                          <span className="text-xs font-bold text-[#17352A]">Private Class</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">Half Day & Full Day Tiers</span>
                        </button>
                      </div>
                    </div>

                    {/* If Join Class: Program Selection (Program A vs Program B) */}
                    {cookingClassMode === "join" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#17352A] block">
                            Select Join Program:
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {cookingPrograms.map((prog) => {
                              const isSelected = selectedCookProgramId === prog.id;
                              return (
                                <button
                                  key={prog.id}
                                  type="button"
                                  onClick={() => setSelectedCookProgramId(prog.id)}
                                  className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                                    isSelected
                                      ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                      : "border-[#D6CEBD] bg-white hover:border-[#B89450]/50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-serif text-xs font-bold text-[#17352A]">
                                      {prog.name}
                                    </span>
                                    <span className="rounded bg-[#17352A] px-1.5 py-0.5 text-[10px] font-bold text-[#D1B16A]">
                                      {prog.menus_count} MENUS
                                    </span>
                                  </div>
                                  {prog.includes_market_tour && (
                                    <span className="text-[10px] text-emerald-800 font-medium block mt-1">
                                      ✓ Market Tour
                                    </span>
                                  )}
                                  <div className="mt-2 pt-2 border-t border-[#E5E0D8] space-y-0.5 text-[11px]">
                                    <div className="flex justify-between font-mono font-bold text-[#B89450]">
                                      <span>Cooking Student:</span>
                                      <span>THB {prog.cooking_price.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-mono text-[#8C6D2D] text-[10px]">
                                      <span>Non-Cooking Person:</span>
                                      <span>THB {prog.non_cooking_price.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Steppers: Cooking Students & Non-Cooking Companions */}
                        <div className="space-y-3 border-t border-[#B89450]/20 pt-3">
                          {/* Cooking Student Stepper */}
                          <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                            <div>
                              <p className="text-xs font-bold text-[#282722]">
                                Cooking Students
                              </p>
                              <p className="text-[11px] font-mono text-[#B89450]">
                                THB {activeCookProgram.cooking_price.toLocaleString()} / person
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(1, cookingParticipants - 1);
                                  setCookingParticipants(next);
                                  setAdults(next);
                                }}
                                disabled={cookingParticipants <= 1}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-5 text-center font-bold text-sm text-[#282722]">
                                {cookingParticipants}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = cookingParticipants + 1;
                                  setCookingParticipants(next);
                                  setAdults(next);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Non-Cooking Companion Stepper */}
                          <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                            <div>
                              <p className="text-xs font-bold text-[#282722]">
                                Non-Cooking Companions
                              </p>
                              <p className="text-[11px] font-mono text-[#8C6D2D]">
                                THB {activeCookProgram.non_cooking_price.toLocaleString()} / person
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(0, nonCookingCompanions - 1);
                                  setNonCookingCompanions(next);
                                  setChildren(next);
                                }}
                                disabled={nonCookingCompanions <= 0}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-5 text-center font-bold text-sm text-[#282722]">
                                {nonCookingCompanions}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = nonCookingCompanions + 1;
                                  setNonCookingCompanions(next);
                                  setChildren(next);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Menu Note from Picture 1 */}
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 leading-relaxed italic">
                          **Choose the menu on the day that customers come to study.
                        </div>
                      </div>
                    )}

                    {/* If Private Class: Duration & Pax Tier Selection */}
                    {cookingClassMode === "private" && (
                      <div className="space-y-4">
                        {/* Half Day vs Full Day Duration */}
                        <div>
                          <label className="text-xs font-bold text-[#17352A] block mb-1.5">
                            Private Duration:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCookingPrivateClassType("Half Day");
                                const firstHd = cookingPrivateTiers.find((t) => t.class_type === "Half Day");
                                if (firstHd) setCookingPrivateTierId(firstHd.id);
                              }}
                              className={`rounded-xl border p-2.5 text-center transition cursor-pointer ${
                                cookingPrivateClassType === "Half Day"
                                  ? "border-[#B89450] bg-[#FAF8F3] font-bold text-[#17352A] ring-1 ring-[#B89450]"
                                  : "border-[#D6CEBD] bg-white text-gray-600"
                              }`}
                            >
                              <span className="text-xs block">Half Day</span>
                              <span className="text-[10px] text-gray-500 font-normal">4 menus</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCookingPrivateClassType("Full Day");
                                const firstFd = cookingPrivateTiers.find((t) => t.class_type === "Full Day");
                                if (firstFd) setCookingPrivateTierId(firstFd.id);
                              }}
                              className={`rounded-xl border p-2.5 text-center transition cursor-pointer ${
                                cookingPrivateClassType === "Full Day"
                                  ? "border-[#B89450] bg-[#FAF8F3] font-bold text-[#17352A] ring-1 ring-[#B89450]"
                                  : "border-[#D6CEBD] bg-white text-gray-600"
                              }`}
                            >
                              <span className="text-xs block">Full Day</span>
                              <span className="text-[10px] text-gray-500 font-normal">7 menus</span>
                            </button>
                          </div>
                        </div>

                        {/* Pax Tiers Cards */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#17352A] block">
                            Select Group Size Tier:
                          </label>
                          <div className="space-y-2">
                            {cookingPrivateTiers
                              .filter((t) => t.class_type === cookingPrivateClassType)
                              .map((tier) => {
                                const isSelected = activePrivateTier.id === tier.id;
                                return (
                                  <button
                                    key={tier.id}
                                    type="button"
                                    onClick={() => setCookingPrivateTierId(tier.id)}
                                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                                      isSelected
                                        ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                        : "border-[#D6CEBD] bg-white hover:border-[#B89450]/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                          isSelected ? "border-[#B89450]" : "border-gray-400"
                                        }`}
                                      >
                                        {isSelected && <div className="h-2 w-2 rounded-full bg-[#B89450]" />}
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-[#17352A] block">
                                          {tier.tier_label}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                          {tier.min_pax} - {tier.max_pax} Passengers
                                        </span>
                                      </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-[#B89450]">
                                      THB {tier.price.toLocaleString()}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extra Dish Add-on Stepper (From Picture 1: Extra Dish 1,000 THB Per Dish) */}
                    <div className="border-t border-[#B89450]/20 pt-4">
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-white p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                            <span>🍲</span>
                            <span>Extra Dish Add-on</span>
                          </p>
                          <p className="text-[10px] text-red-600 font-semibold">
                            Extra Dish {extraDishPrice.toLocaleString()} THB Per Dish
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setExtraDishesCount((p) => Math.max(0, p - 1))}
                            disabled={extraDishesCount <= 0}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-[#282722]">
                            {extraDishesCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExtraDishesCount((p) => p + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : effectivePricingModel === "activity_atv" ? (
                  /* 2. ACTIVITIES & ATV (TICKET2ATTRACTION STYLE) */
                  <div className="space-y-6">
                    {/* Package Option Selector */}
                    <div className="mt-5 border-t border-[#B89450]/20 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                          🏎
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Choose ATV / Activity Package
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {atvPackages.map((pkg) => {
                          const isSelected = selectedAtvPackageId === pkg.id;
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => setSelectedAtvPackageId(pkg.id)}
                              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                                isSelected
                                  ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                  : "border-[#D6CEBD] bg-white hover:border-[#B89450]/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                    isSelected ? "border-[#B89450]" : "border-gray-400"
                                  }`}
                                >
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-[#B89450]" />}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-[#17352A] block">
                                    {pkg.name}
                                  </span>
                                  {pkg.duration && (
                                    <span className="text-[10px] text-gray-500 font-semibold block">
                                      Duration: {pkg.duration}
                                    </span>
                                  )}
                                  {pkg.description && (
                                    <span className="text-[10px] text-gray-500 block line-clamp-1">
                                      {pkg.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono text-xs font-bold text-[#B89450]">
                                  <span className="text-[10px] font-normal text-gray-500 mr-1">Driver</span>
                                  THB {pkg.driver_price.toLocaleString()}
                                </div>
                                <div className="font-mono text-[10px] text-gray-600 mt-0.5">
                                  <span className="text-[10px] font-normal text-gray-500 mr-1">Passenger</span>
                                  THB {pkg.passenger_price.toLocaleString()}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Steppers: Drivers, Passengers, Children */}
                    <div className="space-y-3 border-t border-[#B89450]/20 pt-4">
                      <h4 className="text-xs font-bold text-[#17352A]">
                        Number of Riders
                      </h4>

                      {/* Driver Stepper */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722]">
                            ATV Driver (Solo Rider)
                          </p>
                          <p className="text-[11px] font-mono text-[#B89450]">
                            THB {activeAtvPackage.driver_price.toLocaleString()} / person
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(1, atvDrivers - 1);
                              setAtvDrivers(next);
                              setAdults(next);
                            }}
                            disabled={atvDrivers <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-[#282722]">
                            {atvDrivers}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = atvDrivers + 1;
                              setAtvDrivers(next);
                              setAdults(next);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Passenger Stepper */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722]">
                            ATV Passenger (Tandem / Back Seat)
                          </p>
                          <p className="text-[11px] font-mono text-[#8C6D2D]">
                            THB {activeAtvPackage.passenger_price.toLocaleString()} / person
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, atvPassengers - 1);
                              setAtvPassengers(next);
                              setChildren(next);
                            }}
                            disabled={atvPassengers <= 0}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-[#282722]">
                            {atvPassengers}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = atvPassengers + 1;
                              setAtvPassengers(next);
                              setChildren(next);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Child Stepper */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722]">
                            Child Rider (4–11 yrs)
                          </p>
                          <p className="text-[11px] font-mono text-gray-600">
                            THB {(activeAtvPackage.child_price ?? activeAtvPackage.passenger_price).toLocaleString()} / child
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, atvChildren - 1);
                              setAtvChildren(next);
                              setInfants(next);
                            }}
                            disabled={atvChildren <= 0}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-[#282722]">
                            {atvChildren}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = atvChildren + 1;
                              setAtvChildren(next);
                              setInfants(next);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Session Time Slot Selection */}
                    <div className="space-y-2 border-t border-[#B89450]/20 pt-4">
                      <label className="text-xs font-bold text-[#17352A] block">
                        Select Session Departure Time:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {atvSlots.map((slot) => {
                          const isSelected = atvSessionSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setAtvSessionSlot(slot)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-bold transition cursor-pointer ${
                                isSelected
                                  ? "border-[#B89450] bg-[#17352A] text-[#D1B16A] shadow-xs"
                                  : "border-[#D6CEBD] bg-white text-[#282722] hover:border-[#B89450]"
                              }`}
                            >
                              ⏰ {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : effectivePricingModel === "transfer_timetable" ? (
                  /* 3. SPEEDBOAT BOAT TIMETABLE (PICTURE 2 STYLE) */
                  <div className="space-y-6">
                    {/* Route Schedule Group Tabs */}
                    <div className="mt-5 border-t border-[#B89450]/20 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                          🚤
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Select Speedboat Route Schedule
                        </h3>
                      </div>

                      <div className="space-y-1.5">
                        <select
                          value={selectedRouteGroup}
                          onChange={(e) => {
                            const group = e.target.value;
                            setSelectedRouteGroup(group);
                            const firstInGroup = timetableRoutes.find((r) => r.schedule_route === group);
                            if (firstInGroup) setSelectedTimetableRouteId(firstInGroup.id);
                          }}
                          className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs font-semibold text-[#17352A] focus:border-[#B89450] focus:outline-none"
                        >
                          {Array.from(new Set(timetableRoutes.map((r) => r.schedule_route))).map((group) => (
                            <option key={group} value={group}>
                              Schedule: {group}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Departure Schedules for Selected Route */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#17352A] block">
                        Select Departure Departure & Pier:
                      </label>
                      <div className="space-y-2">
                        {timetableRoutes
                          .filter((r) => r.schedule_route === selectedRouteGroup)
                          .map((route) => {
                            const isSelected = activeTimetableRoute.id === route.id;
                            return (
                              <button
                                key={route.id}
                                type="button"
                                onClick={() => setSelectedTimetableRouteId(route.id)}
                                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                                  isSelected
                                    ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                    : "border-[#D6CEBD] bg-white hover:border-[#B89450]/50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                      isSelected ? "border-[#B89450]" : "border-gray-400"
                                    }`}
                                  >
                                    {isSelected && <div className="h-2 w-2 rounded-full bg-[#B89450]" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-[#17352A]">
                                        {route.departure_time} hrs
                                      </span>
                                      <span className="text-gray-400 text-xs">→</span>
                                      <span className="font-mono text-xs font-semibold text-gray-700">
                                        {route.arrival_time} hrs
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-[#5D5A50] block mt-0.5">
                                      {route.departure_pier} → {route.arrival_pier}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-xs font-bold text-[#B89450]">
                                    <span className="text-[10px] font-normal text-gray-500 mr-1">Adult</span>
                                    THB {route.adult_price.toLocaleString()}
                                  </div>
                                  <div className="font-mono text-[10px] text-[#8C6D2D] mt-0.5">
                                    <span className="text-[10px] font-normal text-gray-500 mr-1">Child</span>
                                    THB {route.child_price.toLocaleString()}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Steppers: Adults & Children */}
                    <div className="space-y-3 border-t border-[#B89450]/20 pt-4">
                      <h4 className="text-xs font-bold text-[#17352A]">
                        Number of Passengers
                      </h4>

                      {/* Adult Stepper */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722]">
                            Adult Passenger (12+ yrs)
                          </p>
                          <p className="text-[11px] font-mono text-[#B89450]">
                            THB {activeTimetableRoute.adult_price.toLocaleString()} / person
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(1, transferAdults - 1);
                              setTransferAdults(next);
                              setAdults(next);
                            }}
                            disabled={transferAdults <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-[#282722]">
                            {transferAdults}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = transferAdults + 1;
                              setTransferAdults(next);
                              setAdults(next);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Child Stepper */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722]">
                            Child Passenger (4–11 yrs)
                          </p>
                          <p className="text-[11px] font-mono text-[#8C6D2D]">
                            THB {activeTimetableRoute.child_price.toLocaleString()} / child
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, transferChildren - 1);
                              setTransferChildren(next);
                              setChildren(next);
                            }}
                            disabled={transferChildren <= 0}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-[#282722]">
                            {transferChildren}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = transferChildren + 1;
                              setTransferChildren(next);
                              setChildren(next);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : tourType === "Ticket Only" ? (
                  /* TICKET ONLY RESERVATION SIDEBAR (Directly matches user sketch) */
                  <div className="space-y-6">
                    {/* 1. ⊕ Ticket Type */}
                    <div className="mt-5 border-t border-[#B89450]/20 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                          ⊕
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Ticket Type
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {availableTicketTiers.map((tier) => {
                          const name = (isChinese ? tier.name_zh : isThai ? tier.name_th : tier.name_en) || tier.name_en;
                          const isSelected = selectedTicketTierId === tier.id || (!selectedTicketTierId && tier.id === availableTicketTiers[0].id);
                          const adultP = tier.adult_price ?? tier.price;
                          const childP = tier.child_price;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setSelectedTicketTierId(tier.id)}
                              className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                                isSelected
                                  ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                  : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                    isSelected ? "border-[#B89450]" : "border-gray-400"
                                  }`}
                                >
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-[#B89450]" />}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-[#17352A] block">{name}</span>
                                  {tier.description_en && (
                                    <span className="text-[10px] text-gray-500 block">{tier.description_en}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono text-xs font-bold text-[#B89450]">
                                  <span className="text-[10px] font-normal text-gray-500 mr-1">Adult</span>
                                  THB {Number(adultP).toLocaleString()}
                                </div>
                                {childP !== undefined && childP !== null && (
                                  <div className="font-mono text-[11px] font-semibold text-gray-600 mt-0.5">
                                    <span className="text-[10px] font-normal text-gray-500 mr-1">Child</span>
                                    THB {Number(childP).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. ⊕ Option (Add-ons) */}
                    <div className="border-t border-[#B89450]/20 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                            ⊕
                          </span>
                          <h3 className="font-serif text-sm font-bold text-[#282722]">
                            Option (Add-ons)
                          </h3>
                        </div>
                        {addonTotal > 0 && (
                          <span className="text-xs font-mono font-bold text-[#B89450]">
                            +THB {addonTotal.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {availableAddons.map((addon) => {
                          const name = (isChinese ? addon.name_zh : isThai ? addon.name_th : addon.name_en) || addon.name_en;
                          const isChecked = selectedAddonIds.includes(addon.id);
                          return (
                            <label
                              key={addon.id}
                              className={`flex items-start justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
                                isChecked
                                  ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                  : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAddonIds([...selectedAddonIds, addon.id]);
                                    } else {
                                      setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                                    }
                                  }}
                                  className="mt-0.5 h-4 w-4 rounded border-[#D6CEBD] text-[#B89450] focus:ring-[#B89450]"
                                />
                                <div>
                                  <span className="text-xs font-bold text-[#17352A] block">{name}</span>
                                  {addon.description_en && (
                                    <span className="text-[10px] text-gray-500 block">{addon.description_en}</span>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold text-[#B89450] shrink-0">
                                +THB {addon.price.toLocaleString()}
                                <span className="text-[10px] text-gray-400 font-normal block text-right">
                                  {addon.price_type === "per_person" ? "/pax" : "/booking"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Transfer (Add-ons) */}
                    <div className="border-t border-[#B89450]/20 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17352A] text-[10px] font-bold text-[#D1B16A]">
                          🚐
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Transfer (Add-ons)
                        </h3>
                      </div>
                      <div className="space-y-2.5">
                        {/* No Transfer */}
                        <button
                          type="button"
                          onClick={() => setTransferOption("no_transfer")}
                          className={`w-full rounded-xl border p-3.5 text-left transition ${
                            transferOption === "no_transfer"
                              ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                transferOption === "no_transfer" ? "border-[#B89450]" : "border-gray-400"
                              }`}
                            >
                              {transferOption === "no_transfer" && (
                                <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#282722]">No Transfer.</p>
                              <p className="mt-0.5 text-[11px] text-[#5D5A50]">
                                Self-travel / Walk-in to venue directly
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Transfer */}
                        <button
                          type="button"
                          onClick={() => setTransferOption("transfer")}
                          className={`w-full rounded-xl border p-3.5 text-left transition ${
                            transferOption === "transfer"
                              ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                  transferOption === "transfer" ? "border-[#B89450]" : "border-gray-400"
                                }`}
                              >
                                {transferOption === "transfer" && (
                                  <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#282722]">Transfer</p>
                                <p className="mt-0.5 text-[11px] text-[#5D5A50]">
                                  Hotel pick-up & drop-off service
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#B89450]">
                              +THB {ticketTransferRatePerPerson} / person
                            </span>
                          </div>
                        </button>

                        {/* Transfer Sub-inputs */}
                        {transferOption === "transfer" && (
                          <div className="rounded-xl border border-[#B89450]/40 bg-[#FAF8F3] p-3.5 space-y-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#282722] mb-1">
                                - Pick up location *
                              </label>
                              {pickupLocations.length > 0 ? (
                                <select
                                  value={selectedLocationId || ""}
                                  onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                                >
                                  <option value="">Select pick up location zone...</option>
                                  {pickupLocations.map((loc) => {
                                    const p = Number(loc.adult_price || 0);
                                    const pLabel = p > 0 ? ` (+THB ${p.toLocaleString()})` : " (Free)";
                                    return (
                                      <option key={loc.id} value={loc.id}>
                                        {loc.location_name}{pLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={pickupHotelAddress}
                                  onChange={(e) => setPickupHotelAddress(e.target.value)}
                                  placeholder="e.g. Patong / Kata / Karon / Kamala / Phuket Town"
                                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-[#282722] mb-1">
                                - Hotel Name *
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={hotelName}
                                  onChange={(e) => setHotelName(e.target.value)}
                                  placeholder="Hotel / Resort Name"
                                  className="sm:col-span-2 w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={roomNumber}
                                  onChange={(e) => setRoomNumber(e.target.value)}
                                  placeholder="Room No"
                                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Number of Passenger */}
                    <div className="border-t border-[#B89450]/20 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Number of Passenger
                        </h3>
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#5D5A50] bg-white border border-[#D6CEBD] px-2.5 py-1 rounded-full">
                          <span className="inline-flex items-center gap-1.5"><AdultIcon className="w-3.5 h-3.5 text-[#B89450]" /> {adults}</span>
                          {children > 0 && <span className="inline-flex items-center gap-1.5"><span className="text-[#D6CEBD]">•</span> <ChildIcon className="w-3.5 h-3.5 text-[#B89450]" /> {children}</span>}
                          {infants > 0 && <span className="inline-flex items-center gap-1.5"><span className="text-[#D6CEBD]">•</span> <InfantIcon className="w-3.5 h-3.5 text-[#B89450]" /> {infants}</span>}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {/* Adult */}
                        <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                          <div>
                            <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                              <AdultIcon className="w-4 h-4 text-[#B89450]" />
                              <span>Adult</span>
                            </p>
                            <p className="text-[11px] text-[#5D5A50] font-mono mt-0.5">
                              THB {baseTicketAdultPrice.toLocaleString()} / ticket
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateGuestCount("adults", -1)}
                              disabled={adults <= 1}
                              aria-label="Decrease adults"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-bold text-[#282722] text-sm">{adults}</span>
                            <button
                              type="button"
                              onClick={() => updateGuestCount("adults", 1)}
                              disabled={guests >= guestLimit}
                              aria-label="Increase adults"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15 disabled:opacity-30 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Child */}
                        <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                          <div>
                            <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                              <ChildIcon className="w-4 h-4 text-[#B89450]" />
                              <span>Child</span>
                              <span className="text-[10px] font-normal text-[#736E62]">
                                ({tourData?.child_age_min ?? 4}–{tourData?.child_age_max ?? 11} yrs)
                              </span>
                            </p>
                            {extendedData?.child_height_min && extendedData?.child_height_max && (
                              <span className="block text-[10px] font-medium text-amber-800">
                                Height: {extendedData.child_height_min}–{extendedData.child_height_max} cm
                              </span>
                            )}
                            <p className="text-[11px] text-[#5D5A50] font-mono mt-0.5">
                              THB {baseTicketChildPrice.toLocaleString()} / ticket
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateGuestCount("children", -1)}
                              disabled={children <= 0}
                              aria-label="Decrease children"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-bold text-[#282722] text-sm">{children}</span>
                            <button
                              type="button"
                              onClick={() => updateGuestCount("children", 1)}
                              disabled={guests >= guestLimit}
                              aria-label="Increase children"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15 disabled:opacity-30 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Infant */}
                        <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                          <div>
                            <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                              <InfantIcon className="w-4 h-4 text-[#B89450]" />
                              <span>Infant</span>
                              <span className="text-[10px] font-normal text-[#736E62]">
                                ({tourData?.infant_age_min ?? 0}–{tourData?.infant_age_max ?? 2} yrs)
                              </span>
                            </p>
                            {extendedData?.infant_height_max && (
                              <span className="block text-[10px] font-medium text-emerald-800">
                                Free entry under {extendedData.infant_height_max} cm
                              </span>
                            )}
                            <p className="text-[11px] text-[#5D5A50] font-mono mt-0.5">
                              {infantPrice > 0 ? `THB ${infantPrice.toLocaleString()} / ticket` : "Free"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateGuestCount("infants", -1)}
                              disabled={infants <= 0}
                              aria-label="Decrease infants"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-bold text-[#282722] text-sm">{infants}</span>
                            <button
                              type="button"
                              onClick={() => updateGuestCount("infants", 1)}
                              disabled={guests >= guestLimit}
                              aria-label="Increase infants"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15 disabled:opacity-30 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Child Height Policy Note Notice */}
                        {extendedData?.child_height_note && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                            <span className="font-bold">Child Policy: </span>
                            {extendedData.child_height_note}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* STANDARD NON-TICKET FLOW */
                  <>
                    {/* CASE B: Transfer Only */}
                    {tourType === "Transfer Only" && (
                  <div className="mt-6 border-t border-[#B89450]/20 pt-5 space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        🚐
                      </span>
                      <h3 className="font-serif text-sm font-bold text-blue-950">
                        Transfer Details & Vehicle
                      </h3>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Vehicle Class *
                      </label>
                      <select
                        value={transferVehicleType}
                        onChange={(e) => setTransferVehicleType(e.target.value)}
                        className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                      >
                        {(extendedData?.transfer_details?.vehicle_types || [
                          "VIP Toyota Commuter Van (1-10 pax)",
                          "Executive Sedan (1-3 pax)",
                          "Luxury SUV (1-4 pax)"
                        ]).map((v, i) => (
                          <option key={i} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Pickup Location (Airport / Hotel / Pier) *
                      </label>
                      <input
                        type="text"
                        value={transferPickupPoint}
                        onChange={(e) => setTransferPickupPoint(e.target.value)}
                        placeholder="e.g. Phuket Airport (HKT) - Terminal 1 or Hotel Lobby"
                        required
                        className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Drop-off Destination *
                      </label>
                      <input
                        type="text"
                        value={transferDropoffPoint}
                        onChange={(e) => setTransferDropoffPoint(e.target.value)}
                        placeholder="e.g. Resort Name, Villa, or Pier"
                        required
                        className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                          Flight No. (Optional)
                        </label>
                        <input
                          type="text"
                          value={transferFlightNumber}
                          onChange={(e) => setTransferFlightNumber(e.target.value)}
                          placeholder="e.g. TG 201"
                          className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                          Pickup Time *
                        </label>
                        <input
                          type="time"
                          value={transferPickupTime}
                          onChange={(e) => setTransferPickupTime(e.target.value)}
                          className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Luggage Count
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setTransferLuggageCount((prev) => Math.max(0, prev - 1))}
                          className="h-7 w-7 rounded-full border border-gray-300 bg-white font-bold text-sm"
                        >
                          −
                        </button>
                        <span className="font-bold text-xs">{transferLuggageCount} standard luggage bags</span>
                        <button
                          type="button"
                          onClick={() => setTransferLuggageCount((prev) => prev + 1)}
                          className="h-7 w-7 rounded-full border border-[#B89450] bg-white font-bold text-sm text-[#B89450]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASE C: Activity Only, Tour Package, Private Tour */}
                {tourType !== "Transfer Only" && (
                  <>
                    {/* Activity Session Slot picker if Activity Only */}
                    {tourType === "Activity Only" && (
                      <div className="mt-6 border-t border-[#B89450]/20 pt-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                            ⚡
                          </span>
                          <h3 className="font-serif text-sm font-bold text-rose-950">
                            Activity Session Time Slot
                          </h3>
                        </div>
                        <select
                          value={activitySessionSlot}
                          onChange={(e) => setActivitySessionSlot(e.target.value)}
                          className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                        >
                          {(extendedData?.activity_details?.session_slots || [
                            "Morning 09:00 - 11:30",
                            "Afternoon 13:30 - 16:00"
                          ]).map((slot, i) => (
                            <option key={i} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Pick-up Extra Fees Notice */}
                    <div className="mt-4">
                      {!chargesExtraPickup ? (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-xs text-emerald-950">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-emerald-700 font-bold">✓</span>
                            <span>All-Inclusive Base Price</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-emerald-800">
                            Hotel pick-up is completely included in your tour price with no extra charges!
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>ℹ️</span>
                            <span>Pick-up Surcharge Required</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-amber-800">
                            This tour charges extra fees for hotel pick-up. Pick-up location is required to calculate zone surcharge.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 1. Transfer option */}
                    <div className="mt-5 border-t border-[#B89450]/20 pt-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B89450] text-xs font-bold text-white">
                          1
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Transfer option
                        </h3>
                      </div>

                      <div className="mt-3 space-y-2.5">
                        {/* No Transfer */}
                        <button
                          type="button"
                          onClick={() => setTransferOption("no_transfer")}
                          className={`w-full rounded-xl border p-3.5 text-left transition ${
                            transferOption === "no_transfer"
                              ? "border-[#B89450] bg-[#FAF8F3] shadow-xs ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white hover:border-[#B89450]/60 hover:bg-[#FAF8F3]/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                transferOption === "no_transfer"
                                  ? "border-[#B89450]"
                                  : "border-gray-400"
                              }`}
                            >
                              {transferOption === "no_transfer" && (
                                <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#282722]">No Transfer</p>
                              <p className="mt-0.5 text-[11px] text-[#5D5A50]">
                                {enableMeetingPoint
                                  ? (isChinese ? "自行前往集合地点" : isThai ? "เดินทางไปยังจุดนัดพบด้วยตนเอง" : "Travel to the meeting point by yourself")
                                  : (isChinese ? "自行前往 / 直接入园登记" : isThai ? "เดินทางไปถึงด้วยตนเอง / เช็คอินหน้างาน" : "Self-arrival / direct check-in")}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Transfer */}
                        <button
                          type="button"
                          disabled={!enableTransfer}
                          onClick={() => setTransferOption("transfer")}
                          className={`w-full rounded-xl border p-3.5 text-left transition ${
                            !enableTransfer
                              ? "cursor-not-allowed opacity-40 border-[#D6CEBD] bg-gray-50"
                              : transferOption === "transfer"
                              ? "border-[#B89450] bg-[#FAF8F3] shadow-xs ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white hover:border-[#B89450]/60 hover:bg-[#FAF8F3]/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                transferOption === "transfer"
                                  ? "border-[#B89450]"
                                  : "border-gray-400"
                              }`}
                            >
                              {transferOption === "transfer" && (
                                <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#282722]">
                                Transfer {!chargesExtraPickup && <span className="text-emerald-700 font-semibold">(Included)</span>}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#5D5A50]">
                                Hotel pick-up {!chargesExtraPickup ? "at no extra charge" : "with zone fee"}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Pick-up location */}
                    {transferOption === "transfer" && (
                      <div className="mt-5 border-t border-[#B89450]/20 pt-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B89450] text-xs font-bold text-white">
                            2
                          </span>
                          <h3 className="font-serif text-sm font-bold text-[#282722]">
                            Pick-up location {chargesExtraPickup ? "(Required for zone fee)" : "(Optional Zone)"}
                          </h3>
                        </div>

                        <div className="mt-3 space-y-2">
                          {pickupLocations.length > 0 && (
                            <div className="space-y-1.5">
                              {pickupLocations.map((loc) => {
                                const isSelected = selectedLocationId === loc.id;
                                return (
                                  <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => setSelectedLocationId(loc.id)}
                                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                                      isSelected
                                        ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                        : "border-[#D6CEBD] bg-white hover:border-[#B89450]/60 hover:bg-[#FAF8F3]/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                          isSelected
                                            ? "border-[#B89450]"
                                            : "border-gray-400"
                                        }`}
                                      >
                                        {isSelected && (
                                          <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                                        )}
                                      </div>
                                      <span className="text-xs font-bold text-[#282722]">
                                        {loc.location_name}
                                      </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#B89450]">
                                      {Number(loc.adult_price || 0) > 0 ? (
                                        Number(loc.adult_price) < baseAdultPrice
                                          ? `+THB ${Number(loc.adult_price).toLocaleString()}`
                                          : `THB ${Number(loc.adult_price).toLocaleString()}`
                                      ) : (
                                        <span className="text-emerald-700 font-semibold">Free / Included</span>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Hotel / Pickup Address Input */}
                          <div className="mt-3 pt-2 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] font-medium text-[#5D5A50]">
                                  Hotel Name *
                                </label>
                                <input
                                  type="text"
                                  value={hotelName}
                                  onChange={(e) => setHotelName(e.target.value)}
                                  placeholder="e.g. Andaman Cannacia"
                                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-[#5D5A50]">
                                  Room No.
                                </label>
                                <input
                                  type="text"
                                  value={roomNumber}
                                  onChange={(e) => setRoomNumber(e.target.value)}
                                  placeholder="e.g. 217"
                                  className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-[#5D5A50]">
                                Additional Pickup Notes (Optional)
                              </label>
                              <input
                                type="text"
                                value={pickupHotelAddress}
                                onChange={(e) => setPickupHotelAddress(e.target.value)}
                                placeholder="e.g. Wait at main hotel lobby"
                                className="w-full rounded-xl border border-[#D6CEBD] bg-white p-2.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* If No Transfer: Show meeting point details */}
                    {transferOption === "no_transfer" && enableMeetingPoint && meetingPoint && (
                      <div className="mt-5 border-t border-[#B89450]/20 pt-4">
                        <div className="rounded-xl border border-[#B89450]/35 bg-[#FAF8F3] p-4 text-xs text-[#282722]">
                          <p className="font-bold text-[#282722]">
                            Meeting Point: {meetingPoint}
                          </p>
                          <p className="mt-1 text-[#5D5A50]">
                            Meeting Time: <strong>{meetingTime}</strong>
                          </p>
                          {additionalNotes && (
                            <p className="mt-2 text-[11px] text-[#5D5A50]">
                              {additionalNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Custom Ticket Tiers (if configured) */}
                {extendedData?.ticket_types && extendedData.ticket_types.length > 0 && (
                  <div className="mt-6 border-t border-[#B89450]/20 pt-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B89450] text-xs font-bold text-white">
                        🎟
                      </span>
                      <h3 className="font-serif text-sm font-bold text-[#282722]">
                        {isChinese ? "选择门票级别 / 类别" : isThai ? "เลือกประเภทบัตร" : "Select Ticket Tier"}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTicketTierId("")}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                          selectedTicketTierId === ""
                            ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                            : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-[#17352A]">
                            {isChinese ? "标准常规门票" : isThai ? "บัตรมาตรฐานทั่วไป" : "Standard Admission"}
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {isChinese ? "常规入园通行" : isThai ? "เข้าชมทั่วไปตามมาตรฐาน" : "Standard park access"}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#B89450]">
                          THB {effectiveAdultPrice.toLocaleString()}
                        </span>
                      </button>

                      {extendedData.ticket_types.map((tier) => {
                        const name = (isChinese ? tier.name_zh : isThai ? tier.name_th : tier.name_en) || tier.name_en;
                        const isSelected = selectedTicketTierId === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedTicketTierId(tier.id)}
                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                              isSelected
                                ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div>
                              <span className="text-xs font-bold text-[#17352A]">{name}</span>
                              {tier.description_en && (
                                <span className="text-[10px] text-gray-500 block">{tier.description_en}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-[#B89450] block">
                                Adult: THB {(tier.adult_price ?? tier.price).toLocaleString()}
                              </span>
                              {tier.child_price !== undefined && tier.child_price !== null && (
                                <span className="font-mono text-[11px] font-semibold text-gray-500 block">
                                  Child: THB {tier.child_price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Number of passengers */}
                <div className="mt-6 border-t border-[#B89450]/20 pt-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B89450] text-xs font-bold text-white">
                          3
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          Number of passengers
                        </h3>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-[#5D5A50] bg-white border border-[#D6CEBD] px-2.5 py-1 rounded-full">
                        <span className="inline-flex items-center gap-1.5"><AdultIcon className="w-3.5 h-3.5 text-[#B89450]" /> {adults}</span>
                        {children > 0 && <span className="inline-flex items-center gap-1.5"><span className="text-[#D6CEBD]">•</span> <ChildIcon className="w-3.5 h-3.5 text-[#B89450]" /> {children}</span>}
                        {infants > 0 && <span className="inline-flex items-center gap-1.5"><span className="text-[#D6CEBD]">•</span> <InfantIcon className="w-3.5 h-3.5 text-[#B89450]" /> {infants}</span>}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Adult Row */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                            <AdultIcon className="w-4 h-4 text-[#B89450]" />
                            <span>{isChinese ? "成人" : "Adult"}</span>
                            <span className="text-[10px] font-normal text-[#736E62]">
                              ({(tourData?.child_age_max ?? 11) + 1}+ {isChinese ? "岁" : "yrs"})
                            </span>
                          </p>
                          <p className="text-[11px] text-[#5D5A50] font-mono mt-0.5">
                            THB {effectiveAdultPrice.toLocaleString()} / {isChinese ? "人" : "person"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateGuestCount("adults", -1)}
                            disabled={adults <= 1}
                            aria-label="Decrease adults"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-[#282722] text-sm">
                            {adults}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateGuestCount("adults", 1)}
                            disabled={guests >= guestLimit}
                            aria-label="Increase adults"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15 disabled:opacity-30 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Child Row */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                            <ChildIcon className="w-4 h-4 text-[#B89450]" />
                            <span>{isChinese ? "儿童" : "Child"}</span>
                            <span className="text-[10px] font-normal text-[#736E62]">
                              ({tourData?.child_age_min ?? 4}–{tourData?.child_age_max ?? 11}{" "}
                              {isChinese ? "岁" : "yrs"})
                            </span>
                          </p>
                          {extendedData?.child_height_min && extendedData?.child_height_max && (
                            <span className="block text-[10px] font-medium text-amber-800">
                              Height: {extendedData.child_height_min}–{extendedData.child_height_max} cm
                            </span>
                          )}
                          <p className="text-[11px] text-[#5D5A50] font-mono mt-0.5">
                            THB {effectiveChildPrice.toLocaleString()} / {isChinese ? "人" : "person"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateGuestCount("children", -1)}
                            disabled={children <= 0}
                            aria-label="Decrease children"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-[#282722] text-sm">
                            {children}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateGuestCount("children", 1)}
                            disabled={guests >= guestLimit}
                            aria-label="Increase children"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15 disabled:opacity-30 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Infant Row */}
                      <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3">
                        <div>
                          <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                            <InfantIcon className="w-4 h-4 text-[#B89450]" />
                            <span>{isChinese ? "婴儿" : "Infant"}</span>
                            <span className="text-[10px] font-normal text-[#736E62]">
                              ({tourData?.infant_age_min ?? 0}–{tourData?.infant_age_max ?? 2}{" "}
                              {isChinese ? "岁" : "yrs"})
                            </span>
                          </p>
                          {extendedData?.infant_height_max && (
                            <span className="block text-[10px] font-medium text-emerald-800">
                              Free entry under {extendedData.infant_height_max} cm
                            </span>
                          )}
                          <p className="text-[11px] text-[#5D5A50] font-mono mt-0.5">
                            {infantPrice > 0
                              ? `THB ${infantPrice.toLocaleString()} / ${isChinese ? "人" : "person"}`
                              : isChinese
                              ? "免费"
                              : "Free"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateGuestCount("infants", -1)}
                            disabled={infants <= 0}
                            aria-label="Decrease infants"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-[#282722] text-sm">
                            {infants}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateGuestCount("infants", 1)}
                            disabled={guests >= guestLimit}
                            aria-label="Increase infants"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15 disabled:opacity-30 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Child Height Policy Note Notice */}
                      {extendedData?.child_height_note && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                          <span className="font-bold">Child Policy: </span>
                          {extendedData.child_height_note}
                        </div>
                      )}
                    </div>
                </div>

                {/* Optional Tour Add-ons / Extras Section */}
                {extendedData?.optional_addons && extendedData.optional_addons.length > 0 && (
                  <div className="mt-6 border-t border-[#B89450]/20 pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B89450] text-xs font-bold text-white">
                          ✨
                        </span>
                        <h3 className="font-serif text-sm font-bold text-[#282722]">
                          {isChinese ? "可选增值服务 / 升级" : isThai ? "บริการเสริมและอัปเกรดพิเศษ" : "Optional Add-ons & Upgrades"}
                        </h3>
                      </div>
                      {addonTotal > 0 && (
                        <span className="text-xs font-mono font-bold text-[#B89450]">
                          +THB {addonTotal.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {extendedData.optional_addons.map((addon) => {
                        const name = (isChinese ? addon.name_zh : isThai ? addon.name_th : addon.name_en) || addon.name_en;
                        const isChecked = selectedAddonIds.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className={`flex items-start justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
                              isChecked
                                ? "border-[#B89450] bg-[#FAF8F3] ring-1 ring-[#B89450]"
                                : "border-[#D6CEBD] bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAddonIds([...selectedAddonIds, addon.id]);
                                  } else {
                                    setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                                  }
                                }}
                                className="mt-0.5 h-4 w-4 rounded border-[#D6CEBD] text-[#B89450] focus:ring-[#B89450]"
                              />
                              <div>
                                <span className="text-xs font-bold text-[#17352A] block">{name}</span>
                                {addon.description_en && (
                                  <span className="text-[10px] text-gray-500 block">{addon.description_en}</span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#B89450] shrink-0">
                              +THB {addon.price.toLocaleString()}
                              <span className="text-[10px] text-gray-400 font-normal block text-right">
                                {addon.price_type === "per_person" ? (isChinese ? "每位" : isThai ? "ต่อท่าน" : "/pax") : (isChinese ? "每单" : isThai ? "ต่อการจอง" : "/booking")}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

                {/* Itemized Price Breakdown */}
                <div className="mt-6 border-t border-[#B89450]/20 pt-4 space-y-2">
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3.5 space-y-1.5 text-xs">
                    <p className="font-bold text-[#17352A] text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>{isChinese ? "费用明细" : isThai ? "รายละเอียดราคา" : "Price Breakdown"}</span>
                      <span className="font-mono text-[10px] text-gray-500 font-normal">THB</span>
                    </p>

                    {effectivePricingModel === "cooking_class" ? (
                      cookingClassMode === "join" ? (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>Cooking ({cookingParticipants} × THB {activeCookProgram.cooking_price.toLocaleString()}):</span>
                            <span className="font-mono font-semibold">THB {(cookingParticipants * activeCookProgram.cooking_price).toLocaleString()}</span>
                          </div>
                          {nonCookingCompanions > 0 && (
                            <div className="flex justify-between text-gray-700">
                              <span>Non-Cooking ({nonCookingCompanions} × THB {activeCookProgram.non_cooking_price.toLocaleString()}):</span>
                              <span className="font-mono font-semibold">THB {(nonCookingCompanions * activeCookProgram.non_cooking_price).toLocaleString()}</span>
                            </div>
                          )}
                          {extraDishesCount > 0 && (
                            <div className="flex justify-between text-amber-800">
                              <span>Extra Dishes ({extraDishesCount} × THB {extraDishPrice.toLocaleString()}):</span>
                              <span className="font-mono font-semibold">+THB {(extraDishesCount * extraDishPrice).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>Private Class ({activePrivateTier.class_type} {activePrivateTier.tier_label}):</span>
                            <span className="font-mono font-semibold">THB {activePrivateTier.price.toLocaleString()}</span>
                          </div>
                          {extraDishesCount > 0 && (
                            <div className="flex justify-between text-amber-800">
                              <span>Extra Dishes ({extraDishesCount} × THB {extraDishPrice.toLocaleString()}):</span>
                              <span className="font-mono font-semibold">+THB {(extraDishesCount * extraDishPrice).toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )
                    ) : effectivePricingModel === "activity_atv" ? (
                      <>
                        <div className="flex justify-between text-gray-700">
                          <span>ATV Drivers ({atvDrivers} × THB {activeAtvPackage.driver_price.toLocaleString()}):</span>
                          <span className="font-mono font-semibold">THB {(atvDrivers * activeAtvPackage.driver_price).toLocaleString()}</span>
                        </div>
                        {atvPassengers > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>Passengers ({atvPassengers} × THB {activeAtvPackage.passenger_price.toLocaleString()}):</span>
                            <span className="font-mono font-semibold">THB {(atvPassengers * activeAtvPackage.passenger_price).toLocaleString()}</span>
                          </div>
                        )}
                        {atvChildren > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>Children ({atvChildren} × THB {(activeAtvPackage.child_price ?? activeAtvPackage.passenger_price).toLocaleString()}):</span>
                            <span className="font-mono font-semibold">THB {(atvChildren * (activeAtvPackage.child_price ?? activeAtvPackage.passenger_price)).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    ) : effectivePricingModel === "transfer_timetable" ? (
                      <>
                        <div className="flex justify-between text-gray-700">
                          <span>Adults ({transferAdults} × THB {activeTimetableRoute.adult_price.toLocaleString()}):</span>
                          <span className="font-mono font-semibold">THB {(transferAdults * activeTimetableRoute.adult_price).toLocaleString()}</span>
                        </div>
                        {transferChildren > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>Children ({transferChildren} × THB {activeTimetableRoute.child_price.toLocaleString()}):</span>
                            <span className="font-mono font-semibold">THB {(transferChildren * activeTimetableRoute.child_price).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-gray-700">
                          <span>Adults ({adults} × THB {baseTicketAdultPrice.toLocaleString()}):</span>
                          <span className="font-mono font-semibold">THB {(adults * baseTicketAdultPrice).toLocaleString()}</span>
                        </div>
                        {children > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>Children ({children} × THB {baseTicketChildPrice.toLocaleString()}):</span>
                            <span className="font-mono font-semibold">THB {(children * baseTicketChildPrice).toLocaleString()}</span>
                          </div>
                        )}
                        {infants > 0 && infantPrice > 0 && (
                          <div className="flex justify-between text-gray-700">
                            <span>Infants ({infants} × THB {infantPrice.toLocaleString()}):</span>
                            <span className="font-mono font-semibold">THB {(infants * infantPrice).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Pick-up location transfer fee item */}
                    {transferOption === "transfer" && selectedLocation && pickupSurchargeTotal > 0 && (
                      <div className="flex justify-between text-[#B89450] font-semibold border-t border-[#E5E0D8] pt-1">
                        <span>Pick-up Zone ({selectedLocation.location_name}):</span>
                        <span className="font-mono">+THB {pickupSurchargeTotal.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Add-ons */}
                    {addonTotal > 0 && (
                      <div className="flex justify-between text-emerald-800 font-semibold border-t border-[#E5E0D8] pt-1">
                        <span>Optional Add-ons:</span>
                        <span className="font-mono">+THB {addonTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total and Disclaimer */}
                <div className="mt-4 pt-2 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-[#5D5A50]">
                      {isChinese ? "预估总额" : isThai ? "ยอดรวมโดยประมาณ" : "Estimated Total"}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#8D846D]">THB</span>
                  </div>

                  <p className="font-serif text-3xl font-bold text-[#282722]">
                    THB {money(totalPrice, locale)}
                  </p>

                  {/* Dynamic Cancellation & 100% Weather Guarantee Banner */}
                  <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 space-y-1.5 text-xs text-sky-950">
                    <div className="flex items-center gap-1.5 font-bold text-sky-900">
                      <span>🌊</span>
                      <span>
                        {isChinese ? "100% 恶劣天气退改保障" : isThai ? "รับประกันสภาพอากาศและความปลอดภัย 100%" : "100% Weather & Safety Guarantee"}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-900/90 leading-relaxed">
                      {isChinese
                        ? sitePolicies?.cancellation?.weather_clause_zh || sitePolicies?.cancellation?.policy_summary_zh
                        : isThai
                        ? sitePolicies?.cancellation?.weather_clause_th || sitePolicies?.cancellation?.policy_summary_th
                        : sitePolicies?.cancellation?.weather_clause_en || sitePolicies?.cancellation?.policy_summary_en ||
                          "Free cancellation up to 24 hours prior. 100% full refund guaranteed in case of severe Andaman weather advisories."}
                    </p>
                  </div>

                  {/* Dynamic PDPA Checkbox */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3 space-y-1.5">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPdpaAccepted}
                        onChange={(e) => setIsPdpaAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-[#D6CEBD] text-[#B89450] focus:ring-[#B89450]"
                      />
                      <span className="text-[11px] leading-relaxed text-[#282722]">
                        {isChinese
                          ? sitePolicies?.pdpa?.consent_checkbox_zh
                          : isThai
                          ? sitePolicies?.pdpa?.consent_checkbox_th
                          : sitePolicies?.pdpa?.consent_checkbox_en ||
                            "I have read and agree to the Personal Data Protection Act (PDPA) privacy notice and consent to the processing of traveler information for tour booking and statutory insurance."}
                      </span>
                    </label>
                    <div className="pl-6">
                      <button
                        type="button"
                        onClick={() => setIsPdpaModalOpen(true)}
                        className="text-[11px] font-bold text-[#B89450] hover:underline"
                      >
                        {isChinese ? "（点击阅读完整PDPA隐私政策）" : isThai ? "(คลิกเพื่ออ่านประกาศ PDPA ฉบับเต็ม)" : "(Click to read full PDPA privacy notice)"}
                      </button>
                    </div>
                  </div>

                  {dateError && (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-600">
                      {dateError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] py-3.5 text-xs font-bold text-[#282722] shadow-md shadow-[#B89450]/25 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-40"
                  >
                    {tourType === "Ticket Only" ? "Continue to Ticket Details →" : "Continue to Guest Details →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* PDPA Privacy Policy Modal */}
        {isPdpaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-serif text-base font-bold text-[#17352A] flex items-center gap-2">
                  <span>🛡</span>
                  {isChinese
                    ? sitePolicies?.pdpa?.modal_title_zh
                    : isThai
                    ? sitePolicies?.pdpa?.modal_title_th
                    : sitePolicies?.pdpa?.modal_title_en || "PDPA Privacy & Data Protection Notice"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPdpaModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 text-xs text-gray-700 whitespace-pre-line leading-relaxed font-sans pr-2">
                {isChinese
                  ? sitePolicies?.pdpa?.full_policy_zh
                  : isThai
                  ? sitePolicies?.pdpa?.full_policy_th
                  : sitePolicies?.pdpa?.full_policy_en}
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  Version {sitePolicies?.pdpa?.version || "v2.4"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPdpaModalOpen(false)}
                  className="rounded-xl bg-[#17352A] px-5 py-2 text-xs font-bold text-white hover:bg-[#122b22] transition-colors"
                >
                  {isChinese ? "我知道了，关闭" : isThai ? "รับทราบและปิด" : "I Understand & Close"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
