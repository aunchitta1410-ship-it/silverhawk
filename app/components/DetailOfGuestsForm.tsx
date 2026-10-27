
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdultIcon, ChildIcon, InfantIcon } from "@/app/components/PassengerIcons";

type GuestType = "Adult" | "Child" | "Infant";
type Title = "Mr" | "Mrs" | "Ms" | "Miss";

type BookingInfo = {
  bookingId: string;
  tourId: string;
  tour: string;
  price: string;
  totalPrice: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  guests: number;
  name: string;
  email: string;
  childAges: number[];
  childAgeMin?: number;
  childAgeMax?: number;
  infantAgeMin?: number;
  infantAgeMax?: number;
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
};

type Guest = {
  title: Title | "";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nationality: string;
  guestType: GuestType;
  dateOfBirth: string;
  specialRequirements: string;
};

type SpecialRequest = {
  dietary: string[];
  allergies: string[];
  other: string;
};

type Props = {
  guestCount: number;
  bookingId?: string;
  bookingInfo: BookingInfo;
};

const TITLES: Title[] = ["Mr", "Mrs", "Ms", "Miss"];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Buddhist vegetarian",
  "No pork",
  "No beef",
];

const ALLERGY_OPTIONS = [
  "Gluten",
  "Dairy",
  "Nuts",
  "Shellfish",
  "Egg",
  "Other",
];

const PDPA_SETTINGS = {
  version: "v1.0-pdpa-be2562",
  heading: "Thailand Personal Data Protection Act (PDPA B.E. 2562) & Privacy Notice",
  company: "Silver Hawk Co., Ltd. (Phuket, Thailand)",
  message:
    "Under Thailand's Personal Data Protection Act (PDPA B.E. 2562) and the Tourism Business and Guide Act B.E. 2551, Silver Hawk collects and securely processes traveler personal information solely for booking execution, hotel pick-up coordination, mandatory tourist accident insurance, passenger manifest safety compliance, and emergency response.",
  checkboxLabel:
    "I acknowledge and consent to the collection, use, and processing of my personal data under Thailand PDPA B.E. 2562 for tour booking, insurance, and safety operations.",
};

function getGuestTypes(info: BookingInfo): GuestType[] {
  return [
    ...Array.from({ length: info.adults }, () => "Adult" as const),
    ...Array.from({ length: info.children }, () => "Child" as const),
    ...Array.from({ length: info.infants }, () => "Infant" as const),
  ];
}

function createGuest(type: GuestType): Guest {
  return {
    title: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    nationality: "",
    guestType: type,
    dateOfBirth: "",
    specialRequirements: "",
  };
}

function createSpecialRequest(): SpecialRequest {
  return {
    dietary: [],
    allergies: [],
    other: "",
  };
}

function calculateAge(
  dateOfBirth: string,
  travelDate: string
): number | null {
  if (!dateOfBirth || !travelDate) return null;

  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const travel = new Date(`${travelDate}T00:00:00`);

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(travel.getTime()) ||
    birth > travel
  ) {
    return null;
  }

  let age = travel.getFullYear() - birth.getFullYear();

  const beforeBirthday =
    travel.getMonth() < birth.getMonth() ||
    (travel.getMonth() === birth.getMonth() &&
      travel.getDate() < birth.getDate());

  if (beforeBirthday) age--;

  return age;
}

function formatDate(date: string): string {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatPrice(value: string): string {
  if (!value || !Number.isFinite(Number(value))) {
    return "Pending confirmation";
  }

  return `฿${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value))}`;
}

export default function DetailOfGuestsForm({
  guestCount,
  bookingId,
  bookingInfo,
}: Props) {
  const router = useRouter();

  const count = Math.min(20, Math.max(1, guestCount || 1));
  const guestTypes = getGuestTypes(bookingInfo).slice(0, count);

  const [guests, setGuests] = useState<Guest[]>(() => {
    const rawName = (bookingInfo.name || "").trim();
    const nameParts = rawName.split(/\s+/);
    const initialFirstName = nameParts[0] || "";
    const initialLastName = nameParts.slice(1).join(" ") || "";
    const initialEmail = (bookingInfo.email || "").trim();

    return Array.from({ length: count }, (_, index) => {
      const g = createGuest(guestTypes[index] ?? "Adult");
      if (index === 0) {
        g.firstName = initialFirstName;
        g.lastName = initialLastName;
        g.email = initialEmail;
        if (bookingInfo.phone) {
          g.phone = bookingInfo.phone.trim();
        }
      }
      return g;
    });
  });

  const leadLastName = guests[0]?.lastName ?? "";
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdpaAcknowledged, setPdpaAcknowledged] = useState(false);
  const [showPdpaModal, setShowPdpaModal] = useState(false);

  const [sameAsLead, setSameAsLead] = useState<boolean[]>(
    Array(count).fill(false)
  );

  const [specialRequests, setSpecialRequests] = useState<
    Record<number, SpecialRequest>
  >({});

  const [specialRequestOpen, setSpecialRequestOpen] = useState<number | null>(
    null
  );

  function updateGuest(
    index: number,
    field: keyof Guest,
    value: string
  ) {
    setGuests((current) =>
      current.map((guest, i) =>
        i === index ? { ...guest, [field]: value } : guest
      )
    );
  }

  function updateLastName(index: number, value: string) {
    setGuests((current) =>
      current.map((guest, i) =>
        i === index ? { ...guest, lastName: value } : guest
      )
    );
  }

  function toggleSameAsLead(index: number, checked: boolean) {
    setSameAsLead((current) =>
      current.map((value, i) => (i === index ? checked : value))
    );

    if (checked) {
      setGuests((current) =>
        current.map((guest, i) =>
          i === index
            ? { ...guest, lastName: current[0]?.lastName ?? "" }
            : guest
        )
      );
    }
  }

  function getSpecialRequest(index: number): SpecialRequest {
    return specialRequests[index] ?? createSpecialRequest();
  }

  function updateSpecialRequest(
    index: number,
    updates: Partial<SpecialRequest>
  ) {
    setSpecialRequests((current) => ({
      ...current,
      [index]: {
        ...(current[index] ?? createSpecialRequest()),
        ...updates,
      },
    }));
  }

  function toggleSpecialOption(
    index: number,
    category: "dietary" | "allergies",
    option: string
  ) {
    const request = getSpecialRequest(index);
    const selected = request[category];

    const updated = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    updateSpecialRequest(index, { [category]: updated });
  }

  
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSubmitting) return;

    if (!pdpaAcknowledged) {
      setError("Please acknowledge the Privacy Policy before continuing.");
      return;
    }

    if (guests.length !== count || guests.length === 0) {
      setError("Guest information does not match the booking.");
      return;
    }

    const lead = guests[0];

    if (!lead?.phone.trim() || !lead.email.trim()) {
      setError(
        "Please enter the lead passenger's phone number and email."
      );
      return;
    }

    const incomplete = guests.some(
      (guest) =>
        !guest.title ||
        !guest.firstName.trim() ||
        !guest.lastName.trim() ||
        !guest.nationality.trim() ||
        !guest.dateOfBirth
    );

    if (incomplete) {
      setError(
        "Please complete the required information for every traveler."
      );
      return;
    }

    for (const guest of guests) {
      const age = calculateAge(guest.dateOfBirth, bookingInfo.date);

      if (age === null) {
        setError("Please enter a valid date of birth before the travel date.");
        return;
      }

      if (guest.guestType === "Adult" && age < 12) {
        setError(
          "An Adult traveler must meet the tour's adult age requirement."
        );
        return;
      }

      if (
        guest.guestType === "Child" &&
        (age < (bookingInfo.childAgeMin ?? 4) ||
          age > (bookingInfo.childAgeMax ?? 11))
      ) {
        setError(
          `The child's age must be between ${
            bookingInfo.childAgeMin ?? 4
          } and ${bookingInfo.childAgeMax ?? 11}.`
        );
        return;
      }

      if (
        guest.guestType === "Infant" &&
        (age < (bookingInfo.infantAgeMin ?? 0) ||
          age > (bookingInfo.infantAgeMax ?? 2))
      ) {
        setError(
          `The infant's age must be between ${
            bookingInfo.infantAgeMin ?? 0
          } and ${bookingInfo.infantAgeMax ?? 2}.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
 
const response = await fetch("/api/bookings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tourId: bookingInfo.tourId,
    date: bookingInfo.date,
    pdpaAcknowledged,
    privacyPolicyVersion: PDPA_SETTINGS.version,
    pickupRequired: bookingInfo.pickupRequired,
    transferType: bookingInfo.transferType,
    pickupArea: bookingInfo.pickupArea,
    meetingPoint: bookingInfo.meetingPoint,
    meetingTime: bookingInfo.meetingTime,
    pickupNotes: bookingInfo.pickupNotes,
    hotelAddress: bookingInfo.hotel || bookingInfo.pickupNotes,
    roomNumber: bookingInfo.roomNo || "",
    ticketTier: bookingInfo.ticketTier,
    addonIds: bookingInfo.addonIds,
    addonTotal: bookingInfo.addonTotal,
    customBookingData: bookingInfo.customBookingData,
    extraDynamicFields: bookingInfo.extraDynamicFields,
    guests: guests.map((guest, index) => {
      const request = getSpecialRequest(index);

      return {
        title: guest.title,
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        phone: guest.phone.trim(),
        email: guest.email.trim(),
        nationality: guest.nationality.trim(),
        guestType: guest.guestType,
        dateOfBirth: guest.dateOfBirth,
        dietaryRequirements: request.dietary,
        allergies: request.allergies,
        otherRequests: request.other.trim(),
      };
    }),
  }),
});
    
const responseText = await response.text();

let result: {
  success?: boolean;
  error?: string;
  bookingId?: string;
  bookingDisplayId?: string;
  dbId?: number;
  accessToken?: string;
} | null = null;

try {
  if (responseText.trim()) {
    result = JSON.parse(responseText);
  }
} catch {
  throw new Error(
    `Booking API returned an invalid response (HTTP ${response.status}). ` +
    `Response: ${responseText.slice(0, 200) || "(empty)"}`
  );
}

if (!result || typeof result !== "object") {
  throw new Error(
    `Booking API returned an empty response (HTTP ${response.status}). ` +
    "Please check the server terminal for errors."
  );
}

if (
  !response.ok ||
  result.success !== true ||
  !result.bookingId ||
  typeof result.accessToken !== "string" ||
  !/^[a-f0-9]{64}$/i.test(result.accessToken)
) {
  throw new Error(
    result.error ||
    `Unable to save booking information (HTTP ${response.status}).`
  );
}


      // Navigate only after the database transaction succeeds.
      const finalBookingId =
        result.bookingDisplayId ||
        (result.bookingId && (!/^\d+$/.test(String(result.bookingId)) || String(result.bookingId).startsWith("BK-"))
          ? String(result.bookingId)
          : `BK-${result.bookingId}`);

      const params = new URLSearchParams({
        bookingId: finalBookingId,
        token: result.accessToken,
        tourId: bookingInfo.tourId,
        tour: bookingInfo.tour,
        price: bookingInfo.price,
        totalPrice: bookingInfo.totalPrice || bookingInfo.price,
        date: bookingInfo.date,
        adults: String(bookingInfo.adults),
        children: String(bookingInfo.children),
        infants: String(bookingInfo.infants),
        guests: String(bookingInfo.guests),
        name: bookingInfo.name,
        email: bookingInfo.email,
        pdpaAcknowledged: "true",
        privacyPolicyVersion: PDPA_SETTINGS.version,
      });

      if (bookingInfo.pickupRequired) params.set("pickupRequired", bookingInfo.pickupRequired);
      if (bookingInfo.transferType) params.set("transferType", bookingInfo.transferType);
      if (bookingInfo.pickupArea) params.set("pickupArea", bookingInfo.pickupArea);
      if (bookingInfo.meetingPoint) params.set("meetingPoint", bookingInfo.meetingPoint);
      if (bookingInfo.meetingTime) params.set("meetingTime", bookingInfo.meetingTime);
      if (bookingInfo.pickupNotes) params.set("pickupNotes", bookingInfo.pickupNotes);
      if (bookingInfo.ticketTier) params.set("ticketTier", bookingInfo.ticketTier);
      if (bookingInfo.addonTotal) params.set("addonTotal", bookingInfo.addonTotal);
      if (bookingInfo.customBookingData) params.set("customBookingData", bookingInfo.customBookingData);

      const locale = window.location.pathname.split("/")[1] || "en";
      router.push(`/${locale}/confirmation?${params.toString()}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      {/* Guest Information */}
      <form
        onSubmit={handleSubmit}
        className="order-2 min-w-0 space-y-6 lg:order-1 lg:col-span-2"
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-[#17352a]">
            Guest Information
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Please provide the details for every traveler.
          </p>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Please ensure that every traveler’s first and last name exactly
            match their passport or national ID.
          </div>

          <div className="mt-6 space-y-5">
            {guests.map((guest, index) => {
              const typeNumber = guests
                .slice(0, index + 1)
                .filter(
                  (item) => item.guestType === guest.guestType
                ).length;

              const isLead = index === 0;
              const heading = isLead
                ? "Adult 1 – Lead passenger"
                : `${guest.guestType} ${typeNumber}`;

              const request = getSpecialRequest(index);
              const hasRequests =
                request.dietary.length > 0 ||
                request.allergies.length > 0 ||
                request.other.trim().length > 0;

              return (
                <section
                  key={index}
                  className="rounded-xl border border-gray-200 p-4 sm:p-5"
                >
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#17352a]">
                        {heading}
                      </h3>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          guest.guestType === "Infant"
                            ? "border border-purple-200 bg-purple-50 text-purple-700"
                            : guest.guestType === "Child"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "bg-[#edf4f2] text-[#2f6b72]"
                        }`}
                      >
                        {guest.guestType === "Infant" ? (
                          <InfantIcon className="w-3.5 h-3.5 text-purple-600" />
                        ) : guest.guestType === "Child" ? (
                          <ChildIcon className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <AdultIcon className="w-3.5 h-3.5 text-[#2f6b72]" />
                        )}
                        <span>{guest.guestType}</span>
                      </span>
                    </div>

                    {isLead && (
                      <p className="mt-2 text-sm text-gray-500">
                        Booking confirmations and updates will be sent to
                        this traveler.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Title *
                      <select
                        value={guest.title}
                        onChange={(event) =>
                          updateGuest(index, "title", event.target.value)
                        }
                        required
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 font-normal"
                      >
                        <option value="">Select title</option>
                        {TITLES.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Nationality *
                      <input
                        value={guest.nationality}
                        onChange={(event) =>
                          updateGuest(
                            index,
                            "nationality",
                            event.target.value
                          )
                        }
                        required
                        autoComplete="country-name"
                        className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal"
                      />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      First Name *
                      <input
                        value={guest.firstName}
                        onChange={(event) =>
                          updateGuest(
                            index,
                            "firstName",
                            event.target.value
                          )
                        }
                        required
                        autoComplete={isLead ? "given-name" : "off"}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal"
                      />
                    </label>

                    <div className="text-sm font-medium text-gray-700">
                      <label>
                        Last Name *
                        <input
                          value={guest.lastName}
                          onChange={(event) =>
                            updateLastName(index, event.target.value)
                          }
                          required
                          autoComplete={isLead ? "family-name" : "off"}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal"
                        />
                      </label>

                      {!isLead && (
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-normal text-[#2f6b72]">
                          <input
                            type="checkbox"
                            checked={sameAsLead[index] ?? false}
                            onChange={(event) =>
                              toggleSameAsLead(
                                index,
                                event.target.checked
                              )
                            }
                            disabled={!leadLastName.trim()}
                            className="h-4 w-4 accent-[#17352a]"
                          />
                          Same as lead
                        </label>
                      )}
                    </div>

                    {isLead && (
                      <>
                        <label className="block text-sm font-medium text-gray-700">
                          Lead passenger email *
                          <input
                            type="email"
                            value={guest.email}
                            onChange={(event) =>
                              updateGuest(
                                index,
                                "email",
                                event.target.value
                              )
                            }
                            required
                            autoComplete="email"
                            className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal"
                          />
                        </label>

                        <label className="block text-sm font-medium text-gray-700">
                          Lead passenger phone *
                          <input
                            type="tel"
                            value={guest.phone}
                            onChange={(event) =>
                              updateGuest(
                                index,
                                "phone",
                                event.target.value
                              )
                            }
                            required
                            autoComplete="tel"
                            className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal"
                          />
                        </label>
                      </>
                    )}

                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth *
                      <input
                        type="date"
                        value={guest.dateOfBirth}
                        onChange={(event) =>
                          updateGuest(
                            index,
                            "dateOfBirth",
                            event.target.value
                          )
                        }
                        max={bookingInfo.date || undefined}
                        required
                        className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-normal"
                      />

                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        {guest.guestType === "Infant" ? (
                          <>
                            Infant policy: age {bookingInfo.infantAgeMin ?? 0}–{bookingInfo.infantAgeMax ?? 2} on travel date.{" "}
                            {guest.dateOfBirth && (
                              <strong className="text-[#17352a]">
                                (Age: {calculateAge(guest.dateOfBirth, bookingInfo.date) ?? "Invalid"})
                              </strong>
                            )}
                          </>
                        ) : guest.guestType === "Child" ? (
                          <>
                            Child policy: age {bookingInfo.childAgeMin ?? 4}–{bookingInfo.childAgeMax ?? 11} on travel date.{" "}
                            {guest.dateOfBirth && (
                              <strong className="text-[#17352a]">
                                (Age: {calculateAge(guest.dateOfBirth, bookingInfo.date) ?? "Invalid"})
                              </strong>
                            )}
                          </>
                        ) : (
                          <>
                            Adult policy: age 12+ on travel date.{" "}
                            {guest.dateOfBirth && (
                              <strong className="text-[#17352a]">
                                (Age: {calculateAge(guest.dateOfBirth, bookingInfo.date) ?? "Invalid"})
                              </strong>
                            )}
                          </>
                        )}
                      </span>
                    </label>

                    {/* Special Requirements button & Recorded Info Display */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSpecialRequestOpen(index)}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#2f6b72] px-4 py-2 text-xs font-semibold text-[#2f6b72] transition hover:bg-[#edf4f2]"
                        >
                          {hasRequests
                            ? "✏️ Edit special requirements"
                            : "+ Special requirements (optional)"}
                        </button>

                        {hasRequests && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            ✓ Recorded for Passenger {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Display recorded requirements immediately after selection */}
                      {hasRequests && (
                        <div className="mt-3 rounded-xl border border-[#2f6b72]/20 bg-[#F4F9F8] p-3 text-xs space-y-2">
                          <p className="font-bold text-[#17352a] text-[11px] uppercase tracking-wider">
                            Selected Requirements & Requests:
                          </p>

                          {request.dietary.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-700">Dietary:</span>
                              {request.dietary.map((d) => (
                                <span
                                  key={d}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 font-medium text-[11px]"
                                >
                                  <span>🥗</span> {d}
                                </span>
                              ))}
                            </div>
                          )}

                          {request.allergies.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-700">Allergies:</span>
                              {request.allergies.map((a) => (
                                <span
                                  key={a}
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 font-medium text-[11px]"
                                >
                                  <span>⚠️</span> {a}
                                </span>
                              ))}
                            </div>
                          )}

                          {request.other.trim().length > 0 && (
                            <div className="text-gray-700 bg-white/90 p-2 rounded-lg border border-gray-200">
                              <span className="font-semibold text-gray-600 mr-1.5">Note:</span>
                              <span>{request.other.trim()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        {/* Thailand PDPA Privacy Policy Section */}
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base text-emerald-600">🛡️</span>
              <h2 className="font-semibold text-base text-[#17352a]">
                {PDPA_SETTINGS.heading}
              </h2>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              PDPA B.E. 2562
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-gray-600">
            {PDPA_SETTINGS.message}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
              <strong className="text-gray-800">Data Controller:</strong> Silver Hawk Co., Ltd. (Phuket)
            </div>
            <div>
              <strong className="text-gray-800">Legal Purpose:</strong> Tour operation & mandatory insurance
            </div>
            <div>
              <strong className="text-gray-800">Data Rights:</strong> Right to access, rectify, or withdraw consent
            </div>
            <div>
              <strong className="text-gray-800">Support:</strong> privacy@silverhawk.com | 063-6064199
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPdpaModal(true)}
              className="text-xs font-bold text-[#2f6b72] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>📄 View Full PDPA Privacy Notice & Rights</span>
            </button>
            <span className="text-[10px] text-gray-400">
              Version: {PDPA_SETTINGS.version}
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-gray-700 hover:bg-emerald-50 transition-colors">
            <input
              type="checkbox"
              checked={pdpaAcknowledged}
              onChange={(event) =>
                setPdpaAcknowledged(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-[#17352a]"
            />
            <span className="font-medium">{PDPA_SETTINGS.checkboxLabel} *</span>
          </label>
        </section>

        {/* Risk Information & Cancellation Policy Summary */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-amber-200/60 pb-3">
            <span className="text-amber-700">⚠️</span>
            <h2 className="font-semibold text-sm text-amber-950">
              Risk Information & Cancellation Policy Summary
            </h2>
          </div>

          <div className="mt-3 space-y-2.5 text-xs text-amber-900 leading-relaxed">
            <p>
              <strong>When the Operator May Cancel:</strong> If high sea swell, monsoon storm warnings, or official Marine Department directives render navigation unsafe, or if minimum passenger quotas are not met, the admin will cancel the tour with an immediate explanation.
            </p>
            <p className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-emerald-800 font-semibold text-[11px]">
              ✓ Full Refund Guarantee: If the tour is cancelled by our operations team, an automated email with the cancellation reason will be sent to you, and you will receive a 100% full refund or free rescheduling.
            </p>
            <p className="text-[11px] text-amber-800">
              <strong>Customer Cancellation:</strong> Free cancellation up to 24 hours prior to travel. Cancellations within 24 hours or after boarding voucher issuance are non-refundable.
            </p>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#17352a] px-6 py-4 font-semibold text-white transition hover:bg-[#0e251c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Review and confirm"}
          </button>

          <p className="mt-3 text-center text-sm text-gray-500">
            No payment is required until your booking is approved by our team.
          </p>
        </div>
      </form>

      {/* Booking Summary - Right Column */}
      <aside className="order-1 min-w-0 lg:order-2 lg:col-span-1">
        <section className="rounded-2xl border border-[#e5e1d7] bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f6b72]">
            Booking Summary
          </p>

          <h2 className="mt-2 text-lg font-bold leading-snug text-[#17352a]">
            {bookingInfo.tour || "Selected tour"}
          </h2>

          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <div>
              <p className="text-gray-500">
                {bookingInfo.showTime || bookingInfo.ticketTier
                  ? "Show Date / Visit Date"
                  : "Travel date"}
              </p>
              <p className="font-medium text-gray-900">
                {formatDate(bookingInfo.date)}
              </p>
            </div>

            {bookingInfo.showTime && bookingInfo.showTime.trim() !== "" && (
              <div className="border-t border-gray-100 pt-2.5">
                <p className="text-gray-500 text-xs">Show Time / Session</p>
                <p className="font-semibold text-emerald-800 text-xs flex items-center gap-1.5 mt-0.5">
                  <span>🎭</span>
                  <span>{bookingInfo.showTime}</span>
                </p>
              </div>
            )}

            {bookingInfo.ticketTier && (
              <div className="border-t border-gray-100 pt-2.5">
                <p className="text-gray-500 text-xs">Ticket Type</p>
                <p className="font-semibold text-gray-900 text-xs mt-0.5">
                  {bookingInfo.ticketTier}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-1.5"><AdultIcon className="w-3.5 h-3.5 text-[#B89450]" /> Adult</span>
              <span className="font-medium text-gray-900">
                {bookingInfo.adults}
              </span>
            </div>

            {bookingInfo.children > 0 && (
              <div className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-1.5"><ChildIcon className="w-3.5 h-3.5 text-[#B89450]" /> Child</span>
                <span className="font-medium text-gray-900">
                  {bookingInfo.children}
                </span>
              </div>
            )}

            {bookingInfo.infants > 0 && (
              <div className="flex justify-between items-center gap-3">
                <span className="flex items-center gap-1.5"><InfantIcon className="w-3.5 h-3.5 text-[#B89450]" /> Infant</span>
                <span className="font-medium text-gray-900">
                  {bookingInfo.infants}
                </span>
              </div>
            )}

            {bookingInfo.transferType && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-gray-500">Transfer & Pick-up</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {bookingInfo.transferType}
                </p>
                {bookingInfo.pickupArea && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Area: {bookingInfo.pickupArea}
                  </p>
                )}
                {bookingInfo.meetingPoint && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Meeting: {bookingInfo.meetingPoint}
                  </p>
                )}
              </div>
            )}

            {/* Model-Specific Selected Options & Pick-up Fee */}
            {(() => {
              let parsed: Record<string, any> = {};
              try {
                if (bookingInfo.customBookingData) {
                  parsed = JSON.parse(bookingInfo.customBookingData);
                }
              } catch {}
              if (!parsed || Object.keys(parsed).length === 0) return null;
              return (
                <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
                  {parsed.pricing_model === "cooking_class" && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 text-blue-950">
                      <p className="font-bold">🍳 Cooking Class Selection</p>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Mode: {parsed.cooking_mode === "join" ? "Join Class" : "Private Class"}
                      </p>
                      {parsed.cooking_extra_dishes > 0 && (
                        <p className="text-[11px] text-blue-800">
                          Extra Dishes: {parsed.cooking_extra_dishes} (+THB {(parsed.cooking_extra_dishes * 1000).toLocaleString()})
                        </p>
                      )}
                    </div>
                  )}

                  {parsed.pricing_model === "activity_atv" && (
                    <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-rose-950">
                      <p className="font-bold">⚡ ATV Adventure</p>
                      {parsed.atv_slot && (
                        <p className="text-[11px] text-rose-800 mt-0.5">
                          Time Slot: {parsed.atv_slot} hrs
                        </p>
                      )}
                      <p className="text-[11px] text-rose-800">
                        Drivers: {parsed.atv_driver_count || 1} | Passengers: {parsed.atv_passenger_count || 0}
                      </p>
                    </div>
                  )}

                  {parsed.pricing_model === "transfer_timetable" && (
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-amber-950">
                      <p className="font-bold">🛥 Speedboat Transfer</p>
                      {parsed.transfer_route && (
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Route: {parsed.transfer_route}
                        </p>
                      )}
                    </div>
                  )}

                  {parsed.pickup_fee && Number(parsed.pickup_fee) > 0 && (
                    <div className="flex justify-between items-center text-xs text-amber-900 bg-amber-50/80 rounded-md p-1.5 border border-amber-200">
                      <span>Pick-up Zone Surcharge:</span>
                      <strong className="font-mono">+THB {Number(parsed.pickup_fee).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Contact Person */}
            {bookingInfo.name && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-gray-500">Contact Person</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {bookingInfo.name}
                </p>
                {bookingInfo.email && (
                  <p className="text-xs text-gray-500 font-mono">
                    {bookingInfo.email}
                  </p>
                )}
              </div>
            )}

            {/* Special Requirements Summary in Sidebar */}
            {Object.keys(specialRequests).some(
              (key) =>
                (specialRequests[Number(key)]?.dietary?.length ?? 0) > 0 ||
                (specialRequests[Number(key)]?.allergies?.length ?? 0) > 0 ||
                (specialRequests[Number(key)]?.other?.trim()?.length ?? 0) > 0
            ) && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-gray-500">Recorded Special Requests</p>
                <div className="mt-1 space-y-1.5 text-xs">
                  {Object.entries(specialRequests).map(([idx, req]) => {
                    const hasItems =
                      req.dietary.length > 0 ||
                      req.allergies.length > 0 ||
                      req.other.trim().length > 0;
                    if (!hasItems) return null;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg bg-teal-50 border border-teal-100 p-2 text-teal-900"
                      >
                        <p className="font-semibold text-[11px]">
                          Passenger {Number(idx) + 1}:
                        </p>
                        {req.dietary.length > 0 && (
                          <p className="text-[11px] text-gray-700">
                            Diet: {req.dietary.join(", ")}
                          </p>
                        )}
                        {req.allergies.length > 0 && (
                          <p className="text-[11px] text-amber-800">
                            Allergies: {req.allergies.join(", ")}
                          </p>
                        )}
                        {req.other.trim() && (
                          <p className="text-[11px] text-gray-600 truncate">
                            Note: {req.other.trim()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bookingId && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-gray-500">Booking ID</p>
                <p className="break-all font-medium text-gray-900">
                  {bookingId.startsWith("BK-") || !/^\d+$/.test(bookingId)
                    ? bookingId
                    : `BK-${bookingId}`}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600">Estimated total</p>
            <p className="mt-1 text-2xl font-bold text-[#17352a]">
              {formatPrice(
                bookingInfo.totalPrice || bookingInfo.price
              )}
            </p>
          </div>
        </section>
      </aside>

      {/* Special Requirements Popup */}
      {specialRequestOpen !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSpecialRequestOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="special-request-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="special-request-title"
                  className="text-xl font-bold text-[#17352a]"
                >
                  Special requirements
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Optional · Passenger {specialRequestOpen + 1}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSpecialRequestOpen(null)}
                aria-label="Close popup"
                className="rounded-lg px-3 py-1 text-2xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Dietary */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900">
                Dietary requirements
              </h3>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DIETARY_OPTIONS.map((option) => {
                  const selected = getSpecialRequest(
                    specialRequestOpen
                  ).dietary.includes(option);

                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleSpecialOption(
                            specialRequestOpen,
                            "dietary",
                            option
                          )
                        }
                        className="h-4 w-4 accent-[#17352a]"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Allergies */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900">
                Allergies
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Select all that apply.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ALLERGY_OPTIONS.map((option) => {
                  const selected = getSpecialRequest(
                    specialRequestOpen
                  ).allergies.includes(option);

                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleSpecialOption(
                            specialRequestOpen,
                            "allergies",
                            option
                          )
                        }
                        className="h-4 w-4 accent-[#17352a]"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>

              {getSpecialRequest(specialRequestOpen).allergies.includes(
                "Other"
              ) && (
                <p className="mt-3 text-sm text-gray-600">
                  Please describe other allergies in Other requests below.
                </p>
              )}
            </div>

            {/* Other requests */}
            <div className="mt-6">
              <label className="block font-semibold text-gray-900">
                Other requests
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (optional)
                </span>

                <textarea
                  rows={4}
                  maxLength={300}
                  value={getSpecialRequest(specialRequestOpen).other}
                  onChange={(event) =>
                    updateSpecialRequest(specialRequestOpen, {
                      other: event.target.value,
                    })
                  }
                  placeholder="Anything else we should know? e.g. Celebrating an anniversary"
                  className="mt-2 w-full rounded-lg border border-gray-300 p-3 font-normal focus:border-[#2f6b72] focus:outline-none focus:ring-1 focus:ring-[#2f6b72]"
                />
              </label>

              <p className="mt-1 text-right text-xs text-gray-500">
                {getSpecialRequest(specialRequestOpen).other.length}/300
              </p>
            </div>

            {/* Important notice */}
            <div className="mt-5 border-l-4 border-gray-300 bg-gray-50 p-3 text-sm leading-6 text-gray-600">
              Special requests are subject to availability and cannot be
              guaranteed. For severe allergies, please also contact the tour
              operator directly.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSpecialRequestOpen(null)}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => setSpecialRequestOpen(null)}
                className="rounded-lg bg-[#17352a] px-5 py-3 font-semibold text-white hover:bg-[#0e251c]"
              >
                Save requirements
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Full PDPA Privacy Notice Modal */}
      {showPdpaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPdpaModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdpa-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl text-[#282722]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 id="pdpa-modal-title" className="text-lg font-bold text-[#17352A]">
                  Personal Data Protection Policy (PDPA B.E. 2562)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Silver Hawk Co., Ltd. (Phuket, Thailand) · Official Privacy Disclosure
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPdpaModal(false)}
                className="rounded-lg p-1 text-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-gray-700">
              <div>
                <h3 className="font-bold text-[#17352A] text-sm mb-1">
                  1. Identification of the Data Controller
                </h3>
                <p>
                  Silver Hawk Co., Ltd. operates in Phuket, Thailand (Address: 35/109 M.3, T.Vichit, A.Muang, Phuket 83000; Telephone: 063-6064199, 063-5959421; Email: privacy@silverhawk.com). Silver Hawk acts as the Data Controller responsible for safeguarding your personal data under the Thailand Personal Data Protection Act B.E. 2562 (2019).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#17352A] text-sm mb-1">
                  2. Categories of Personal Data Collected
                </h3>
                <p>To deliver quality tours, arrange transfers, and ensure safety, we collect:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Identification Data:</strong> Full name, title, date of birth, age, and nationality (and passport number when required for boat manifests).</li>
                  <li><strong>Contact Information:</strong> Email address, mobile telephone number, and hotel accommodation / room details.</li>
                  <li><strong>Special Health & Dietary Needs:</strong> Dietary preferences (Halal, Vegetarian), food allergies, and physical mobility needs disclosed for your safety.</li>
                  <li><strong>Transaction Details:</strong> Booking code, travel date, payment status, and tour voucher issuance logs.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#17352A] text-sm mb-1">
                  3. Legal Basis and Purpose of Processing
                </h3>
                <p>We process your data strictly under recognized legal bases:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li><strong>Contract Performance:</strong> To reserve tour seats, issue official tour vouchers, coordinate hotel pick-ups, and process bookings.</li>
                  <li><strong>Legal Obligation (Tourism Act):</strong> In compliance with the Thailand Tourism Business and Guide Act B.E. 2551 (and amendments), licensed operators must provide mandatory Tourist Accident Insurance for all onboard passengers and maintain harbor passenger manifests.</li>
                  <li><strong>Vital Interests:</strong> In case of medical emergencies or sea accidents, ensuring immediate hospital admission and emergency contact notifications.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-[#17352A] text-sm mb-1">
                  4. Data Retention & Security Measures
                </h3>
                <p>
                  Personal data is stored in encrypted, access-restricted databases. Data required for insurance audits and commercial receipts is retained for the mandatory statutory period under Thai tax and tourism regulations (typically 5 years), after which it is securely deleted or anonymized.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#17352A] text-sm mb-1">
                  5. Your Rights as a Data Subject
                </h3>
                <p>Under Thailand PDPA B.E. 2562, you have rights to:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Request access to and a copy of your personal data.</li>
                  <li>Request correction of inaccurate or incomplete information.</li>
                  <li>Request deletion or anonymization when data is no longer necessary.</li>
                  <li>Withdraw consent for marketing communications at any time.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-mono">
                Effective: 2026 · Compliant with PDPA B.E. 2562
              </span>
              <button
                type="button"
                onClick={() => {
                  setPdpaAcknowledged(true);
                  setShowPdpaModal(false);
                }}
                className="rounded-xl bg-[#17352A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0e251c] transition-colors cursor-pointer"
              >
                I Understand and Consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
