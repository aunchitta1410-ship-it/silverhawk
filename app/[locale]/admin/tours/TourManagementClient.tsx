"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdultIcon, ChildIcon, InfantIcon } from "@/app/components/PassengerIcons";
import {
  type TourType,
  type TourExtendedData,
  type CustomField,
  type CustomTicketType,
  type OptionalAddon,
  type CustomBookingField,
  type LocalizedRuleItem,
  type PricingModel,
  type CookingClassDetails,
  type ActivityPricingDetails,
  type TransferRouteItem,
  PRESET_CATEGORIES,
  PRESET_TICKET_TYPES,
  DEFAULT_COOKING_CLASS,
  DEFAULT_ACTIVITY_ATV,
  DEFAULT_TRANSFER_ROUTES,
  DEFAULT_NOT_RECOMMENDED_LOCALIZED,
  DEFAULT_INCLUDES_LOCALIZED,
  DEFAULT_EXCLUDES_LOCALIZED,
  DEFAULT_WHAT_TO_BRING_LOCALIZED,
  normalizeRuleItem,
} from "@/lib/tour-extended-types";
import { type PartnerCompanyItem } from "@/lib/partner-companies";
import { generateTourId, getTourDisplayCode } from "@/lib/tour-code";
import { buildSearchableTourText, matchesSearchQuery } from "@/lib/tour-i18n";

export type Tour = {
  id: number;
  title_en: string | null;
  title_zh: string | null;
  title_th: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_th: string | null;
  important_info_en: string | null;
  important_info_zh: string | null;
  important_info_th: string | null;
  operated_days: string | null;
  price: number | null;
  child_price: number | null;
  child_age_min: number | null;
  child_age_max: number | null;
  infant_price: number | null;
  infant_age_min: number | null;
  infant_age_max: number | null;
  image_url: string | null;
  tour_type: string | null;
  destination: string | null;
  theme: string | null;
  category?: string | null;
  subcategory?: string | null;
  start_time: string | null;
  end_time: string | null;
  min_people: number | null;
  max_people: number | null;
  duration: string | null;
  tour_source: "company" | "partner";
  partner_company: string | null;
  enable_transfer?: boolean;
  enable_meeting_point?: boolean;
  meeting_point?: string | null;
  meeting_time?: string | null;
  additional_notes?: string | null;
};

export type TourPickupLocation = {
  id: number;
  tour_id: number;
  location_name: string;
  adult_price: number;
  child_price: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

type ItineraryItem = {
  id: number;
  tour_id: number;
  time: string | null;
  activity_en: string | null;
  activity_zh: string | null;
  activity_th: string | null;
  sort_order: number | null;
  image_url?: string | null;
  image_signed_url?: string | null;
};

type ItineraryDraft = {
  time: string;
  activity_en: string;
  activity_zh: string;
  activity_th: string;
  image_url: string;
  image_signed_url: string;
};

const emptyTour: Omit<Tour, "id"> = {
  title_en: "",
  title_zh: "",
  title_th: "",
  description_en: "",
  description_zh: "",
  description_th: "",
  important_info_en: "",
  important_info_zh: "",
  important_info_th: "",
  operated_days: "",
  price: null,
  child_price: null,
  child_age_min: null,
  child_age_max: null,
  infant_price: null,
  infant_age_min: null,
  infant_age_max: null,
  image_url: "",
  tour_type: "One Day Trip",
  destination: "Phuket",
  theme: "",
  start_time: "",
  end_time: "",
  min_people: null,
  max_people: null,
  duration: "",
  tour_source: "company",
  partner_company: "",
  enable_transfer: true,
  meeting_point: "Ao Nang Pier",
  meeting_time: "08:00",
  additional_notes: "Please arrive at least 15 minutes before departure time.",
};

type Props = {
  initialTours: Tour[];
  initialExtendedData?: Record<string, TourExtendedData>;
  locale: string;
};

export default function TourManagementClient({
  initialTours,
  initialExtendedData = {},
  locale,
}: Props) {
  const [tours, setTours] = useState<Tour[]>(initialTours);
  const [extendedMap, setExtendedMap] = useState<Record<string, TourExtendedData>>(initialExtendedData);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Tour | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Omit<Tour, "id">>({ ...emptyTour });

  // Tab state: General, Rules & Info, Custom Fields, Itinerary, Pricing, Transfer & Pick-up, Images, SEO
  const [activeTab, setActiveTab] = useState<
    "general" | "rules_info" | "custom_fields" | "itinerary" | "pricing" | "transfer" | "images" | "seo"
  >("general");

  // 5 Tour Types
  const [tourType, setTourType] = useState<TourType>("Tour Package");

  // Category & Subcategory (managed in Category tab)
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string[]>>(PRESET_CATEGORIES);
  const [category, setCategory] = useState("Island & Marine");
  const [subcategory, setSubcategory] = useState("One Day Trip");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [tourOrder, setTourOrder] = useState<number>(1);
  const [customTourId, setCustomTourId] = useState<string>("");

  // Automatically compute Tour Order & Tour ID without manual human intervention
  const autoTourOrder = useMemo(() => {
    const finalSub = (customSubcategory.trim() || subcategory || "").trim().toLowerCase();
    const finalCat = (category || "").trim().toLowerCase();

    // If editing existing tour and category/subcategory haven't changed, preserve existing order
    if (editing) {
      const existingExt = extendedMap[String(editing.id)];
      if (
        existingExt?.tour_order &&
        (existingExt.category || "").trim().toLowerCase() === finalCat &&
        (existingExt.subcategory || "").trim().toLowerCase() === finalSub
      ) {
        return existingExt.tour_order;
      }
    }

    // Compute next sequence number in this category + subcategory
    const matchingOrders: number[] = [];
    for (const [tId, ext] of Object.entries(extendedMap)) {
      if (editing && String(tId) === String(editing.id)) continue;
      const c = (ext.category || "").trim().toLowerCase();
      const s = (ext.subcategory || "").trim().toLowerCase();
      if (c === finalCat && s === finalSub) {
        if (typeof ext.tour_order === "number" && ext.tour_order > 0) {
          matchingOrders.push(ext.tour_order);
        } else {
          matchingOrders.push(1);
        }
      }
    }

    if (matchingOrders.length === 0) return 1;
    return Math.max(...matchingOrders) + 1;
  }, [category, subcategory, customSubcategory, extendedMap, editing]);

  const autoTourId = useMemo(() => {
    const finalSub = customSubcategory.trim() || subcategory;
    return generateTourId(category, finalSub, autoTourOrder);
  }, [category, subcategory, customSubcategory, autoTourOrder]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab");
      if (t === "categories" || t === "subcategories") {
        window.location.href = `/${locale}/admin/categories`;
        return;
      }
    }

    async function loadCategories() {
      try {
        const res = await fetch("/api/admin/tour-categories");
        const json = await res.json();
        if (res.ok && json.categories && Object.keys(json.categories).length > 0) {
          setCategoriesMap(json.categories);
        }
      } catch (err) {
        console.warn("Could not load categories map:", err);
      }
    }
    void loadCategories();
  }, [locale]);

  // Extra Pick-up Fee Policy: false = all included in tour; true = charges extra for pickups
  const [chargesExtraPickupFee, setChargesExtraPickupFee] = useState(false);

  // General Information & Tour Package Rules (Trilingual: EN, TH, ZH)
  const [notRecommended, setNotRecommended] = useState<LocalizedRuleItem[]>(
    DEFAULT_NOT_RECOMMENDED_LOCALIZED.map(normalizeRuleItem)
  );
  const [newNotRecEn, setNewNotRecEn] = useState("");
  const [newNotRecTh, setNewNotRecTh] = useState("");
  const [newNotRecZh, setNewNotRecZh] = useState("");

  const [tourIncludes, setTourIncludes] = useState<LocalizedRuleItem[]>(
    DEFAULT_INCLUDES_LOCALIZED.map(normalizeRuleItem)
  );
  const [newIncludeEn, setNewIncludeEn] = useState("");
  const [newIncludeTh, setNewIncludeTh] = useState("");
  const [newIncludeZh, setNewIncludeZh] = useState("");

  const [tourExcludes, setTourExcludes] = useState<LocalizedRuleItem[]>(
    DEFAULT_EXCLUDES_LOCALIZED.map(normalizeRuleItem)
  );
  const [newExcludeEn, setNewExcludeEn] = useState("");
  const [newExcludeTh, setNewExcludeTh] = useState("");
  const [newExcludeZh, setNewExcludeZh] = useState("");

  const [whatToBring, setWhatToBring] = useState<LocalizedRuleItem[]>(
    DEFAULT_WHAT_TO_BRING_LOCALIZED.map(normalizeRuleItem)
  );
  const [newBringEn, setNewBringEn] = useState("");
  const [newBringTh, setNewBringTh] = useState("");
  const [newBringZh, setNewBringZh] = useState("");

  // Editing state for existing rule/info items
  const [editingRule, setEditingRule] = useState<{
    section: "not_recommended" | "includes" | "excludes" | "what_to_bring";
    index: number;
    en: string;
    th: string;
    zh: string;
  } | null>(null);

  // Multiple Pictures / Gallery
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");

  // Dynamic Custom Fields for Overview & General Info (e.g. Field Name: Guide, Value: Chinese)
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldNameEn, setNewFieldNameEn] = useState("");
  const [newFieldNameTh, setNewFieldNameTh] = useState("");
  const [newFieldNameZh, setNewFieldNameZh] = useState("");
  const [newFieldValueEn, setNewFieldValueEn] = useState("");
  const [newFieldValueTh, setNewFieldValueTh] = useState("");
  const [newFieldValueZh, setNewFieldValueZh] = useState("");

  // Custom Ticket Types (for Ticket Only & tier pricing)
  const [ticketTypes, setTicketTypes] = useState<CustomTicketType[]>([]);
  const [newTicketNameEn, setNewTicketNameEn] = useState("");
  const [newTicketNameTh, setNewTicketNameTh] = useState("");
  const [newTicketNameZh, setNewTicketNameZh] = useState("");
  const [newTicketPrice, setNewTicketPrice] = useState<number | "">("");
  const [newTicketChildPrice, setNewTicketChildPrice] = useState<number | "">("");
  const [newTicketChildHeightNote, setNewTicketChildHeightNote] = useState("");
  const [newTicketDescEn, setNewTicketDescEn] = useState("");

  // Child & Infant Height Policies
  const [childHeightMin, setChildHeightMin] = useState<number | "">("");
  const [childHeightMax, setChildHeightMax] = useState<number | "">("");
  const [infantHeightMax, setInfantHeightMax] = useState<number | "">("");
  const [childHeightNote, setChildHeightNote] = useState<string>("");

  // Partner Companies & Details
  const [partnerCompanies, setPartnerCompanies] = useState<string[]>([]);
  const [partnerCompanyList, setPartnerCompanyList] = useState<PartnerCompanyItem[]>([]);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerContactPerson, setNewPartnerContactPerson] = useState("");
  const [newPartnerContactPhone, setNewPartnerContactPhone] = useState("");
  const [newPartnerContactEmail, setNewPartnerContactEmail] = useState("");
  const [newPartnerNotes, setNewPartnerNotes] = useState("");
  const [isAddingPartnerModalOpen, setIsAddingPartnerModalOpen] = useState(false);
  const [partnerModalTab, setPartnerModalTab] = useState<"add" | "manage">("add");
  const [partnerDetails, setPartnerDetails] = useState<{
    partner_tour_code?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    commission_rate?: string;
    lead_time_hours?: number;
    notes?: string;
  }>({});

  // Specialized Rate Designs (1. Cooking Class, 2. Activities / ATV, 3. Transfer Service Timetable)
  const [pricingModel, setPricingModel] = useState<PricingModel>("standard");
  const [cookingClassDetails, setCookingClassDetails] = useState<CookingClassDetails>(DEFAULT_COOKING_CLASS);
  const [activityPricing, setActivityPricing] = useState<ActivityPricingDetails>(DEFAULT_ACTIVITY_ATV);
  const [transferRoutes, setTransferRoutes] = useState<TransferRouteItem[]>(DEFAULT_TRANSFER_ROUTES);

  // Draft inputs for Cooking Class
  const [newCookProgName, setNewCookProgName] = useState("");
  const [newCookProgPrice, setNewCookProgPrice] = useState<number | "">("");
  const [newCookProgNonCookPrice, setNewCookProgNonCookPrice] = useState<number | "">("");
  const [newCookProgMenus, setNewCookProgMenus] = useState<number | "">(4);
  const [newCookProgMarketTour, setNewCookProgMarketTour] = useState(true);
  const [newCookProgNotes, setNewCookProgNotes] = useState("");
  const [newPrivClassType, setNewPrivClassType] = useState<"Half Day" | "Full Day">("Half Day");
  const [newPrivMenus, setNewPrivMenus] = useState<number | "">(4);
  const [newPrivTierLabel, setNewPrivTierLabel] = useState("");
  const [newPrivMinPax, setNewPrivMinPax] = useState<number | "">(1);
  const [newPrivMaxPax, setNewPrivMaxPax] = useState<number | "">(5);
  const [newPrivPrice, setNewPrivPrice] = useState<number | "">("");

  // Draft inputs for ATV & Activities
  const [newAtvPkgName, setNewAtvPkgName] = useState("");
  const [newAtvDuration, setNewAtvDuration] = useState("");
  const [newAtvDriverPrice, setNewAtvDriverPrice] = useState<number | "">("");
  const [newAtvPassengerPrice, setNewAtvPassengerPrice] = useState<number | "">("");
  const [newAtvChildPrice, setNewAtvChildPrice] = useState<number | "">("");
  const [newAtvDesc, setNewAtvDesc] = useState("");
  const [newAtvSlot, setNewAtvSlot] = useState("");

  // Draft inputs for Transfer Timetable
  const [newRouteSchedule, setNewRouteSchedule] = useState("Phuket - Phi Phi Island");
  const [newRouteDeptPier, setNewRouteDeptPier] = useState("Rassada Pier");
  const [newRouteArrPier, setNewRouteArrPier] = useState("Tonsai Pier");
  const [newRouteDeptTime, setNewRouteDeptTime] = useState("");
  const [newRouteArrTime, setNewRouteArrTime] = useState("");
  const [newRouteAdultPrice, setNewRouteAdultPrice] = useState<number | "">("");
  const [newRouteChildPrice, setNewRouteChildPrice] = useState<number | "">("");
  const [newRouteBoatType, setNewRouteBoatType] = useState("Speedboat");

  // Optional Add-ons / Extras
  const [optionalAddons, setOptionalAddons] = useState<OptionalAddon[]>([]);
  const [newAddonNameEn, setNewAddonNameEn] = useState("");
  const [newAddonNameTh, setNewAddonNameTh] = useState("");
  const [newAddonNameZh, setNewAddonNameZh] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState<number | "">("");
  const [newAddonPriceType, setNewAddonPriceType] = useState<"per_person" | "per_booking">("per_person");
  const [newAddonDescEn, setNewAddonDescEn] = useState("");

  // Custom Booking Questions / Fields
  const [customBookingFields, setCustomBookingFields] = useState<CustomBookingField[]>([]);
  const [newCbfLabelEn, setNewCbfLabelEn] = useState("");
  const [newCbfLabelTh, setNewCbfLabelTh] = useState("");
  const [newCbfLabelZh, setNewCbfLabelZh] = useState("");
  const [newCbfPlaceholder, setNewCbfPlaceholder] = useState("");
  const [newCbfRequired, setNewCbfRequired] = useState(false);

  // Type-specific metadata
  const [ticketDetails, setTicketDetails] = useState<{
    venue_address?: string;
    redemption_point?: string;
    validity_notes?: string;
    admission_hours?: string;
    show_times?: string[];
    daily_shows_count?: number;
    has_transfer_addon?: boolean;
    transfer_price?: number;
    unit?: string;
    custom_details?: CustomField[];
  }>({
    venue_address: "Attraction Ticket Counter, Phuket",
    redemption_point: "Present digital e-voucher at Ticket Gate",
    validity_notes: "Valid only on selected date during operating hours",
    admission_hours: "09:00 - 18:00 (Daily)",
    show_times: [],
    daily_shows_count: 0,
    has_transfer_addon: true,
    transfer_price: 350,
    unit: "per ticket",
    custom_details: [],
  });
  const [newShowTimeInput, setNewShowTimeInput] = useState("");
  const [newTicketFieldLabel, setNewTicketFieldLabel] = useState("");
  const [newTicketFieldValue, setNewTicketFieldValue] = useState("");
  const [transferDetails, setTransferDetails] = useState({
    service_type: "Airport Transfer" as "Airport Transfer" | "Hotel Transfer" | "Point-to-Point",
    vehicle_types: ["VIP Toyota Commuter Van (1-10 pax)", "Executive Sedan (1-3 pax)", "Luxury SUV (1-4 pax)"],
    pickup_zones: ["Phuket Airport (HKT)", "Phuket Town", "Patong", "Kata/Karon", "Rawai/Nai Harn"],
    dropoff_zones: ["Hotel Lobby", "Phuket Airport (HKT)", "Rassada Pier", "Ao Po Marina"],
    luggage_policy: "1 standard suitcase + 1 carry-on per passenger",
  });
  const [activityDetails, setActivityDetails] = useState({
    activity_name: "Signature Island Activity",
    session_slots: ["Morning 09:00 - 11:30", "Afternoon 13:30 - 16:00"],
    duration: "2 Hours",
    equipment_provided: ["Full safety gear", "Instructor guidance", "Complimentary locker"],
    safety_requirements: "Minimum age 10 years old. Good physical condition required.",
  });

  // Transfer & Pick-up states
  const [enableTransfer, setEnableTransfer] = useState(true);
  const [enableMeetingPoint, setEnableMeetingPoint] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<TourPickupLocation[]>([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [meetingPoint, setMeetingPoint] = useState("Ao Nang Pier");
  const [meetingTime, setMeetingTime] = useState("08:00");
  const [additionalNotes, setAdditionalNotes] = useState(
    "Please arrive at least 15 minutes before departure time."
  );

  // Pick-up Location Modal state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
  const [locationForm, setLocationForm] = useState<{
    location_name: string;
    adult_price: number;
    child_price: number;
    notes: string;
    is_active: boolean;
  }>({
    location_name: "",
    adult_price: 1500,
    child_price: 1100,
    notes: "-",
    is_active: true,
  });

  // Live Preview interactive state
  const [previewTransferOption, setPreviewTransferOption] = useState<"no_transfer" | "transfer">("transfer");
  const [previewSelectedLocationId, setPreviewSelectedLocationId] = useState<number | null>(null);
  const [previewAdults, setPreviewAdults] = useState(2);
  const [previewChildren, setPreviewChildren] = useState(1);
  const [previewInfants, setPreviewInfants] = useState(0);

  // Image upload states
  const [isUploadingTourImage, setIsUploadingTourImage] = useState(false);
  const tourImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const galleryImageInputRef = useRef<HTMLInputElement | null>(null);

  // Itinerary states
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itinerarySaving, setItinerarySaving] = useState(false);
  const [itineraryMessage, setItineraryMessage] = useState("");
  const [editingItineraryId, setEditingItineraryId] = useState<number | null>(null);
  const [itineraryDraft, setItineraryDraft] = useState<ItineraryDraft>({
    time: "",
    activity_en: "",
    activity_zh: "",
    activity_th: "",
    image_url: "",
    image_signed_url: "",
  });

  const formRef = useRef<HTMLDivElement | null>(null);

  // Load partner companies on mount
  useEffect(() => {
    async function loadPartners() {
      try {
        const res = await fetch("/api/admin/partner-companies");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.partnerCompanies)) {
            setPartnerCompanyList(json.partnerCompanies);
          }
          if (Array.isArray(json.companies)) {
            setPartnerCompanies(json.companies);
          }
        }
      } catch (err) {
        console.warn("Could not load partner companies:", err);
      }
    }
    void loadPartners();
  }, []);

  async function handleAddPartnerCompany() {
    if (!newPartnerName.trim()) return;
    try {
      const res = await fetch("/api/admin/partner-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPartnerName.trim(),
          contact_person: newPartnerContactPerson.trim(),
          contact_phone: newPartnerContactPhone.trim(),
          contact_email: newPartnerContactEmail.trim(),
          notes: newPartnerNotes.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setPartnerCompanies(json.companies || []);
        if (Array.isArray(json.partnerCompanies)) {
          setPartnerCompanyList(json.partnerCompanies);
        }
        setForm((prev) => ({ ...prev, partner_company: newPartnerName.trim() }));
        if (newPartnerContactPerson.trim() || newPartnerContactPhone.trim() || newPartnerContactEmail.trim()) {
          setPartnerDetails((prev) => ({
            ...prev,
            contact_name: newPartnerContactPerson.trim() || prev.contact_name,
            contact_phone: newPartnerContactPhone.trim() || prev.contact_phone,
            contact_email: newPartnerContactEmail.trim() || prev.contact_email,
            notes: newPartnerNotes.trim() || prev.notes,
          }));
        }
        setNewPartnerName("");
        setNewPartnerContactPerson("");
        setNewPartnerContactPhone("");
        setNewPartnerContactEmail("");
        setNewPartnerNotes("");
        setIsAddingPartnerModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to add partner company:", err);
    }
  }

  async function handleDeletePartnerCompany(targetIdOrName: string) {
    if (!window.confirm(`Are you sure you want to delete "${targetIdOrName}" from partner companies? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/partner-companies?id=${encodeURIComponent(targetIdOrName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = await res.json();
        setPartnerCompanies(json.companies || []);
        if (Array.isArray(json.partnerCompanies)) {
          setPartnerCompanyList(json.partnerCompanies);
        }
        if (form.partner_company?.toLowerCase() === targetIdOrName.toLowerCase()) {
          setForm((prev) => ({ ...prev, partner_company: "" }));
        }
      }
    } catch (err) {
      console.error("Failed to delete partner company:", err);
    }
  }

  // Load pick-up information when editing a tour
  async function loadPickupData(tourId: number) {
    setPickupLoading(true);
    try {
      const res = await fetch(`/api/admin/tours/pickup?tour_id=${tourId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setEnableTransfer(json.data.enable_transfer ?? true);
        setEnableMeetingPoint(
          json.data.enable_meeting_point !== false &&
          (json.data.enable_meeting_point === true || Boolean(json.data.meeting_point))
        );
        setMeetingPoint(json.data.meeting_point || "Ao Nang Pier");
        setMeetingTime(json.data.meeting_time || "08:00");
        setAdditionalNotes(
          json.data.additional_notes ||
            "Please arrive at least 15 minutes before departure time."
        );
        const locs: TourPickupLocation[] = json.data.pickup_locations || [];
        setPickupLocations(locs);
        if (locs.length > 0) {
          const firstActive = locs.find((l) => l.is_active) || locs[0];
          setPreviewSelectedLocationId(firstActive.id);
        }
      }
    } catch (err) {
      console.error("Failed to load pickup info:", err);
    } finally {
      setPickupLoading(false);
    }
  }

  // Load itinerary items
  async function loadItinerary(tourId: number) {
    setItineraryLoading(true);
    setItineraryMessage("");
    try {
      const response = await fetch(`/api/admin/tour-itinerary?tour_id=${tourId}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load itinerary.");
      setItinerary(result.items ?? []);
    } catch (error) {
      setItinerary([]);
      setItineraryMessage(
        error instanceof Error ? error.message : "Unable to load itinerary."
      );
    } finally {
      setItineraryLoading(false);
    }
  }

  // Load extended tour data (tour type, general info, inclusions, exclusions, gallery)
  async function loadExtendedTourData(tourId: number) {
    try {
      const res = await fetch(`/api/admin/tours/extended?tour_id=${tourId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setTourType(json.data.tour_type || "Tour Package");
        const loadedCat = json.data.category || "Island & Marine";
        const loadedSub = json.data.subcategory || "One Day Trip";
        setCategory(loadedCat);
        setSubcategory(loadedSub);
        setCategoriesMap((prev) => {
          if (loadedCat && !prev[loadedCat]) {
            return { ...prev, [loadedCat]: loadedSub ? [loadedSub] : [] };
          }
          if (loadedCat && loadedSub && prev[loadedCat] && !prev[loadedCat].includes(loadedSub)) {
            return { ...prev, [loadedCat]: [...prev[loadedCat], loadedSub] };
          }
          return prev;
        });
        setChargesExtraPickupFee(Boolean(json.data.charges_extra_pickup_fee));
        setNotRecommended(
          ((json.data.not_recommended && json.data.not_recommended.length > 0)
            ? json.data.not_recommended
            : DEFAULT_NOT_RECOMMENDED_LOCALIZED
          ).map(normalizeRuleItem)
        );
        setTourIncludes(
          ((json.data.tour_includes && json.data.tour_includes.length > 0)
            ? json.data.tour_includes
            : DEFAULT_INCLUDES_LOCALIZED
          ).map(normalizeRuleItem)
        );
        setTourExcludes(
          ((json.data.tour_excludes && json.data.tour_excludes.length > 0)
            ? json.data.tour_excludes
            : DEFAULT_EXCLUDES_LOCALIZED
          ).map(normalizeRuleItem)
        );
        setWhatToBring(
          ((json.data.what_to_bring && json.data.what_to_bring.length > 0)
            ? json.data.what_to_bring
            : DEFAULT_WHAT_TO_BRING_LOCALIZED
          ).map(normalizeRuleItem)
        );
        setGalleryImages(json.data.gallery_images || []);
        if (json.data.tour_order !== undefined) setTourOrder(json.data.tour_order);
        if (json.data.custom_tour_id) setCustomTourId(json.data.custom_tour_id);
        setExtendedMap((prev) => ({ ...prev, [String(tourId)]: json.data }));
        if (json.data.custom_fields) setCustomFields(json.data.custom_fields);
        if (json.data.ticket_types) setTicketTypes(json.data.ticket_types);
        if (json.data.optional_addons) setOptionalAddons(json.data.optional_addons);
        if (json.data.custom_booking_fields) setCustomBookingFields(json.data.custom_booking_fields);
        if (json.data.ticket_details) {
          const td = json.data.ticket_details;
          let cdList: CustomField[] = Array.isArray(td.custom_details) ? [...td.custom_details] : [];
          if (cdList.length === 0) {
            // Seed initial fields from legacy fixed fields so nothing is lost
            if (td.venue_address) {
              cdList.push({
                id: "td_venue",
                name_en: "Attraction Venue",
                value_en: td.venue_address,
              });
            }
            if (td.redemption_point) {
              cdList.push({
                id: "td_redemption",
                name_en: "Ticket Redemption Point",
                value_en: td.redemption_point,
              });
            }
            if (td.admission_hours) {
              cdList.push({
                id: "td_hours",
                name_en: "Admission Operating Hours",
                value_en: td.admission_hours,
              });
            }
            if (td.validity_notes) {
              cdList.push({
                id: "td_validity",
                name_en: "Ticket Validity",
                value_en: td.validity_notes,
              });
            }
          }
          setTicketDetails({
            venue_address: td.venue_address || "",
            redemption_point: td.redemption_point || "",
            validity_notes: td.validity_notes || "",
            admission_hours: td.admission_hours || "",
            show_times: td.show_times || [],
            daily_shows_count: td.daily_shows_count || (td.show_times?.length || 0),
            has_transfer_addon: td.has_transfer_addon ?? true,
            transfer_price: td.transfer_price ?? 350,
            unit: td.unit || "per ticket",
            custom_details: cdList,
          });
        }
        if (json.data.child_height_min !== undefined) setChildHeightMin(json.data.child_height_min ?? "");
        if (json.data.child_height_max !== undefined) setChildHeightMax(json.data.child_height_max ?? "");
        if (json.data.infant_height_max !== undefined) setInfantHeightMax(json.data.infant_height_max ?? "");
        if (json.data.child_height_note !== undefined) setChildHeightNote(json.data.child_height_note ?? "");
        if (json.data.partner_details) setPartnerDetails(json.data.partner_details);
        if (json.data.transfer_details) setTransferDetails(json.data.transfer_details);
        if (json.data.activity_details) setActivityDetails(json.data.activity_details);
        if (json.data.pricing_model) setPricingModel(json.data.pricing_model);
        if (json.data.cooking_class_details) setCookingClassDetails(json.data.cooking_class_details);
        if (json.data.activity_pricing) setActivityPricing(json.data.activity_pricing);
        if (json.data.transfer_routes) setTransferRoutes(json.data.transfer_routes);
      }
    } catch (err) {
      console.warn("Could not load extended tour details:", err);
    }
  }

  function startEdit(tour: Tour) {
    setIsFormOpen(true);
    setEditing(tour);
    const { id, ...values } = tour;
    setForm({
      ...emptyTour,
      ...values,
      image_url: tour.image_url === "NULL" ? "" : tour.image_url ?? "",
    });
    setMessage("");
    setActiveTab("general");
    setPreviewTransferOption("transfer");
    setPreviewAdults(2);
    setPreviewChildren(1);
    setPreviewInfants(0);

    const existingExt = extendedMap[String(tour.id)];
    if (existingExt) {
      setTourType(existingExt.tour_type || "Tour Package");
      setCategory(existingExt.category || "Island & Marine");
      setSubcategory(existingExt.subcategory || "One Day Trip");
      setTourOrder(existingExt.tour_order ?? 1);
      setCustomTourId(existingExt.custom_tour_id ?? "");
    } else {
      setTourOrder(1);
      setCustomTourId("");
    }

    void loadPickupData(tour.id);
    void loadItinerary(tour.id);
    void loadExtendedTourData(tour.id);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  function startAdd() {
    setIsFormOpen(true);
    setEditing(null);
    setForm({ ...emptyTour });
    setMessage("");
    setActiveTab("general");
    setTourType("Tour Package");
    setCategory("Island & Marine");
    setSubcategory("One Day Trip");
    setTourOrder(1);
    setCustomTourId("");
    setChargesExtraPickupFee(false);
    setNotRecommended(DEFAULT_NOT_RECOMMENDED_LOCALIZED.map(normalizeRuleItem));
    setTourIncludes(DEFAULT_INCLUDES_LOCALIZED.map(normalizeRuleItem));
    setTourExcludes(DEFAULT_EXCLUDES_LOCALIZED.map(normalizeRuleItem));
    setWhatToBring(DEFAULT_WHAT_TO_BRING_LOCALIZED.map(normalizeRuleItem));
    setNewNotRecEn("");
    setNewNotRecTh("");
    setNewNotRecZh("");
    setNewIncludeEn("");
    setNewIncludeTh("");
    setNewIncludeZh("");
    setNewExcludeEn("");
    setNewExcludeTh("");
    setNewExcludeZh("");
    setNewBringEn("");
    setNewBringTh("");
    setNewBringZh("");
    setEditingRule(null);
    setGalleryImages([]);
    setEnableTransfer(true);
    setEnableMeetingPoint(true);
    setMeetingPoint("Ao Nang Pier");
    setMeetingTime("08:00");
    setAdditionalNotes("Please arrive at least 15 minutes before departure time.");
    setPickupLocations([
      {
        id: 1,
        tour_id: 0,
        location_name: "Ao Nang",
        adult_price: 1500,
        child_price: 1100,
        notes: "-",
        is_active: true,
        sort_order: 1,
      },
      {
        id: 2,
        tour_id: 0,
        location_name: "Krabi Town",
        adult_price: 1700,
        child_price: 1250,
        notes: "-",
        is_active: true,
        sort_order: 2,
      },
      {
        id: 3,
        tour_id: 0,
        location_name: "Klong Muang",
        adult_price: 1900,
        child_price: 1400,
        notes: "-",
        is_active: false,
        sort_order: 3,
      },
    ]);
    setPreviewSelectedLocationId(1);
    setPreviewAdults(2);
    setPreviewChildren(1);
    setPreviewInfants(0);
    setTicketTypes([]);
    setChildHeightMin("");
    setChildHeightMax("");
    setInfantHeightMax("");
    setChildHeightNote("");
    setPartnerDetails({});
    setPricingModel("standard");
    setCookingClassDetails(DEFAULT_COOKING_CLASS);
    setActivityPricing(DEFAULT_ACTIVITY_ATV);
    setTransferRoutes(DEFAULT_TRANSFER_ROUTES);
    setTicketDetails({
      venue_address: "",
      redemption_point: "",
      validity_notes: "",
      admission_hours: "",
      show_times: [],
      daily_shows_count: 0,
      has_transfer_addon: false,
      transfer_price: 0,
      unit: "per ticket",
      custom_details: [],
    });
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
    setForm({ ...emptyTour });
    setMessage("");
  }

  // Upload tour cover image
  async function handleTourImageUpload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Please choose a valid JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Tour image must be smaller than 5 MB.");
      return;
    }

    setIsUploadingTourImage(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/tours/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to upload tour image.");
      }

      setForm((prev) => ({
        ...prev,
        image_url: result.image_url,
      }));

      setMessage("Tour image uploaded successfully. Remember to Save Changes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Tour image upload failed.");
    } finally {
      setIsUploadingTourImage(false);
    }
  }

  // Gallery image handlers
  async function handleGalleryImageUpload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Please choose a valid JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be smaller than 5 MB.");
      return;
    }

    setIsUploadingGalleryImage(true);
    try {
      const response = await fetch("/api/admin/tours/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to upload image.");
      }

      setGalleryImages((prev) => {
        if (!prev.includes(result.image_url)) {
          return [...prev, result.image_url];
        }
        return prev;
      });

      if (!form.image_url) {
        setForm((prev) => ({ ...prev, image_url: result.image_url }));
      }

      setMessage("Image uploaded and added to gallery. Remember to Save Changes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gallery image upload failed.");
    } finally {
      setIsUploadingGalleryImage(false);
    }
  }

  function handleAddGalleryUrl() {
    const url = newGalleryUrl.trim();
    if (!url) return;
    if (!galleryImages.includes(url)) {
      setGalleryImages((prev) => [...prev, url]);
      if (!form.image_url) {
        setForm((prev) => ({ ...prev, image_url: url }));
      }
    }
    setNewGalleryUrl("");
  }

  function handleRemoveGalleryImage(index: number) {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSetAsCover(imageUrl: string) {
    setForm((prev) => ({ ...prev, image_url: imageUrl }));
    if (!galleryImages.includes(imageUrl)) {
      setGalleryImages((prev) => [imageUrl, ...prev]);
    }
  }

  // Toggle active status directly from table row
  function toggleLocationStatus(index: number) {
    setPickupLocations((prev) =>
      prev.map((loc, idx) =>
        idx === index ? { ...loc, is_active: !loc.is_active } : loc
      )
    );
  }

  // Delete pick-up location
  function deleteLocation(index: number) {
    const loc = pickupLocations[index];
    if (window.confirm(`Delete pickup location "${loc.location_name}"?`)) {
      setPickupLocations((prev) => prev.filter((_, idx) => idx !== index));
      if (previewSelectedLocationId === loc.id) {
        const remaining = pickupLocations.filter((l, idx) => idx !== index && l.is_active);
        setPreviewSelectedLocationId(remaining[0]?.id ?? null);
      }
    }
  }

  // Open modal to Add
  function openAddLocationModal() {
    setEditingLocationIndex(null);
    setLocationForm({
      location_name: "",
      adult_price: 1500,
      child_price: 1100,
      notes: "-",
      is_active: true,
    });
    setIsLocationModalOpen(true);
  }

  // Open modal to Edit
  function openEditLocationModal(index: number) {
    setEditingLocationIndex(index);
    const loc = pickupLocations[index];
    setLocationForm({
      location_name: loc.location_name,
      adult_price: loc.adult_price,
      child_price: loc.child_price,
      notes: loc.notes ?? "-",
      is_active: loc.is_active,
    });
    setIsLocationModalOpen(true);
  }

  // Save location modal
  function saveLocationModal() {
    if (!locationForm.location_name.trim()) {
      alert("Please enter a location name.");
      return;
    }

    if (editingLocationIndex !== null) {
      setPickupLocations((prev) =>
        prev.map((loc, idx) =>
          idx === editingLocationIndex
            ? {
                ...loc,
                location_name: locationForm.location_name.trim(),
                adult_price: Number(locationForm.adult_price || 0),
                child_price: Number(locationForm.child_price || 0),
                notes: locationForm.notes.trim() || "-",
                is_active: locationForm.is_active,
              }
            : loc
        )
      );
    } else {
      const newLoc: TourPickupLocation = {
        id: Date.now(),
        tour_id: editing?.id || 0,
        location_name: locationForm.location_name.trim(),
        adult_price: Number(locationForm.adult_price || 0),
        child_price: Number(locationForm.child_price || 0),
        notes: locationForm.notes.trim() || "-",
        is_active: locationForm.is_active,
        sort_order: pickupLocations.length + 1,
      };
      setPickupLocations((prev) => [...prev, newLoc]);
      if (!previewSelectedLocationId) {
        setPreviewSelectedLocationId(newLoc.id);
      }
    }

    setIsLocationModalOpen(false);
  }

  // Save all tour changes (both tour details and pick-up settings)
  async function saveTour(event?: React.FormEvent) {
    if (event) event.preventDefault();

    if (!form.title_en && !form.title_zh && !form.title_th) {
      setMessage("Please enter a tour name in at least one language.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // 1. Save Tour general fields
      const isUpdate = Boolean(editing);
      const tourPayload = {
        ...(isUpdate ? { id: editing!.id } : {}),
        ...form,
        price: form.price == null || (form.price as unknown) === "" ? null : Number(form.price),
        child_price:
          form.child_price == null || (form.child_price as unknown) === ""
            ? null
            : Number(form.child_price),
        child_age_min:
          form.child_age_min == null || (form.child_age_min as unknown) === ""
            ? null
            : Number(form.child_age_min),
        child_age_max:
          form.child_age_max == null || (form.child_age_max as unknown) === ""
            ? null
            : Number(form.child_age_max),
        infant_price:
          form.infant_price == null || (form.infant_price as unknown) === ""
            ? null
            : Number(form.infant_price),
        infant_age_min:
          form.infant_age_min == null || (form.infant_age_min as unknown) === ""
            ? null
            : Number(form.infant_age_min),
        infant_age_max:
          form.infant_age_max == null || (form.infant_age_max as unknown) === ""
            ? null
            : Number(form.infant_age_max),
        min_people:
          form.min_people == null || (form.min_people as unknown) === ""
            ? null
            : Number(form.min_people),
        max_people:
          form.max_people == null || (form.max_people as unknown) === ""
            ? null
            : Number(form.max_people),
      };

      const tourRes = await fetch("/api/admin/tours", {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tourPayload),
      });

      const tourResult = await tourRes.json();
      if (!tourRes.ok) throw new Error(tourResult.error || "Failed to save tour.");

      const savedTourId: number = isUpdate ? editing!.id : tourResult.tour.id;

      // 2. Save Pick-up and Transfer settings
      const pickupPayload = {
        tour_id: savedTourId,
        enable_transfer: enableTransfer,
        enable_meeting_point: enableMeetingPoint,
        meeting_point: enableMeetingPoint ? meetingPoint : "",
        meeting_time: meetingTime,
        additional_notes: additionalNotes,
        pickup_locations: pickupLocations,
      };

      const pickupRes = await fetch("/api/admin/tours/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pickupPayload),
      });

      if (!pickupRes.ok) {
        console.warn("Pickup save warning:", await pickupRes.text());
      }

      // 3. Save Extended Tour Data (5 tour types, categories, subcategories, extra pickup fee policy, rules, gallery)
      const finalSubcategory = customSubcategory.trim() || subcategory;
      const finalTourId = autoTourId;
      const finalTourOrder = autoTourOrder;
      try {
        const extRes = await fetch("/api/admin/tours/extended", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourId: savedTourId,
            custom_tour_id: finalTourId,
            tour_order: finalTourOrder,
            tour_type: tourType,
            category,
            subcategory: finalSubcategory,
            charges_extra_pickup_fee: chargesExtraPickupFee,
            not_recommended: notRecommended,
            tour_includes: tourIncludes,
            tour_excludes: tourExcludes,
            what_to_bring: whatToBring,
            gallery_images: galleryImages,
            custom_fields: customFields,
            ticket_types: ticketTypes,
            optional_addons: optionalAddons,
            custom_booking_fields: customBookingFields,
            ticket_details: ticketDetails,
            transfer_details: transferDetails,
            activity_details: activityDetails,
            child_height_min: childHeightMin === "" ? undefined : Number(childHeightMin),
            child_height_max: childHeightMax === "" ? undefined : Number(childHeightMax),
            infant_height_max: infantHeightMax === "" ? undefined : Number(infantHeightMax),
            child_height_note: childHeightNote || undefined,
            partner_details: partnerDetails,
            pricing_model: pricingModel,
            cooking_class_details: cookingClassDetails,
            activity_pricing: activityPricing,
            transfer_routes: transferRoutes,
          }),
        });
        if (extRes.ok) {
          const extJson = await extRes.json();
          if (extJson.data) {
            setExtendedMap((prev) => ({
              ...prev,
              [String(savedTourId)]: {
                ...(prev[String(savedTourId)] || {}),
                ...extJson.data,
                custom_tour_id: finalTourId,
                tour_order: finalTourOrder,
              },
            }));
          }
        }
      } catch (extErr) {
        console.warn("Extended data save warning:", extErr);
      }

      // Refresh tours list
      const allRes = await fetch("/api/admin/tours");
      const allJson = await allRes.json();
      if (allJson.tours) {
        setTours(allJson.tours);
        const refreshed = allJson.tours.find((t: Tour) => t.id === savedTourId);
        if (refreshed) {
          setEditing(refreshed);
        }
      }

      setMessage("Tour and Pick-up information saved successfully! All updates are live.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error saving tour.");
    } finally {
      setSaving(false);
    }
  }

  // Itinerary image upload
  async function uploadItineraryImage(file: File) {
    if (!editing) {
      setItineraryMessage("Save the tour first before uploading an itinerary image.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setItineraryMessage("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setItineraryMessage("Itinerary image must be smaller than 5 MB.");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/tour-itinerary/upload?tour_id=${encodeURIComponent(editing.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload itinerary image.");

      setItineraryDraft((prev) => ({
        ...prev,
        image_url: result.image_path || result.image_url,
        image_signed_url: result.signed_url || result.image_url,
      }));
      setItineraryMessage("Image uploaded. Click Save Itinerary Item to keep it.");
    } catch (err) {
      setItineraryMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  // Save itinerary item
  async function saveItineraryItem() {
    if (!editing) return;
    if (
      !itineraryDraft.activity_en.trim() &&
      !itineraryDraft.activity_zh.trim() &&
      !itineraryDraft.activity_th.trim()
    ) {
      setItineraryMessage("Please enter an activity in at least one language.");
      return;
    }

    setItinerarySaving(true);
    setItineraryMessage("");

    try {
      const isEditingItem = editingItineraryId !== null;
      const response = await fetch("/api/admin/tour-itinerary", {
        method: isEditingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditingItem ? { id: editingItineraryId } : {}),
          tour_id: editing.id,
          time: itineraryDraft.time || null,
          activity_en: itineraryDraft.activity_en,
          activity_zh: itineraryDraft.activity_zh,
          activity_th: itineraryDraft.activity_th,
          image_url: itineraryDraft.image_url || null,
          sort_order: isEditingItem
            ? itinerary.find((item) => item.id === editingItineraryId)?.sort_order ?? 0
            : itinerary.length + 1,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to save itinerary item.");
      await loadItinerary(editing.id);
      setItineraryDraft({
        time: "",
        activity_en: "",
        activity_zh: "",
        activity_th: "",
        image_url: "",
        image_signed_url: "",
      });
      setEditingItineraryId(null);
      setItineraryMessage("Itinerary item saved successfully.");
    } catch (err) {
      setItineraryMessage(err instanceof Error ? err.message : "Failed to save itinerary item.");
    } finally {
      setItinerarySaving(false);
    }
  }

  // Delete itinerary item
  async function deleteItineraryItem(itemId: number) {
    if (!editing) return;
    if (!confirm("Are you sure you want to delete this schedule item?")) return;

    setItinerarySaving(true);
    setItineraryMessage("");

    try {
      const response = await fetch("/api/admin/tour-itinerary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          tour_id: editing.id,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to delete itinerary item.");
      await loadItinerary(editing.id);
      if (editingItineraryId === itemId) {
        setEditingItineraryId(null);
        setItineraryDraft({
          time: "",
          activity_en: "",
          activity_zh: "",
          activity_th: "",
          image_url: "",
          image_signed_url: "",
        });
      }
      setItineraryMessage("Itinerary item deleted.");
    } catch (err) {
      setItineraryMessage(err instanceof Error ? err.message : "Failed to delete itinerary item.");
    } finally {
      setItinerarySaving(false);
    }
  }

  // Calculate preview pricing
  const previewLocation = pickupLocations.find(
    (loc) => loc.id === previewSelectedLocationId && loc.is_active
  );
  const activePickupLocations = pickupLocations.filter((loc) => loc.is_active);

  const baseAdultPrice = Number(form.price || 1500);
  const baseChildPrice = Number(form.child_price || 1100);

  const previewEffectiveAdultPrice =
    previewTransferOption === "transfer" && previewLocation
      ? previewLocation.adult_price
      : baseAdultPrice;

  const previewEffectiveChildPrice =
    previewTransferOption === "transfer" && previewLocation
      ? previewLocation.child_price
      : baseChildPrice;

  const previewInfantPrice = Number(form.infant_price || 0);

  const previewTotal =
    previewAdults * previewEffectiveAdultPrice +
    previewChildren * previewEffectiveChildPrice +
    previewInfants * previewInfantPrice;

  const filteredTours = tours.filter((tour) => {
    if (!search.trim()) return true;
    const searchableText = buildSearchableTourText(tour);
    return matchesSearchQuery(searchableText, search);
  });

  return (
    <div className="min-h-screen bg-white text-[#282722]">
      {/* Top Bar matching client style */}
      <header className="border-b border-[#D6CEBD]/70 bg-white px-6 py-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg font-bold text-[#282722] tracking-wide">
              Tour Management
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tours..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-[#D6CEBD] bg-[#FAF8F3] px-3.5 py-1.5 pl-8 text-xs text-[#282722] placeholder-[#8D846D] focus:border-[#B89450] focus:bg-white focus:outline-none"
              />
              <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8D846D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#D6CEBD] bg-[#FAF8F3] px-3 py-1 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#D1B16A] to-[#B89450] text-xs font-bold text-[#282722]">
                A
              </span>
              <span className="font-medium text-[#282722]">Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 md:p-8 bg-white">
        {/* Status Message */}
        {message && (
          <div
            role="status"
            className="mb-6 flex items-center justify-between rounded-xl border border-[#B89450]/40 bg-[#FAF8F3] p-4 text-sm text-[#855D10]"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-4 p-1 text-[#855D10] hover:text-[#282722]"
              aria-label="Dismiss message"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* View Mode: Tours List vs Edit Tour Form */}
        {!isFormOpen ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#282722]">All Tours</h1>
                <p className="mt-1 text-xs text-[#5D5A50]">
                  Select a tour to edit its details, transfer options, and pick-up locations.
                </p>
              </div>

              <button
                type="button"
                onClick={startAdd}
                className="rounded-lg bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-5 py-2.5 text-sm font-semibold text-[#282722] shadow-md shadow-[#B89450]/20 hover:brightness-105"
              >
                + Add Tour
              </button>
            </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTours.map((tour) => {
                    const tourCode = getTourDisplayCode(tour, extendedMap[String(tour.id)], tour.id);
                    return (
                      <div
                        key={tour.id}
                        className="group flex flex-col justify-between rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs transition hover:border-[#B89450] hover:shadow-md"
                      >
                        <div>
                          <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-[#D6CEBD]/60 bg-[#FAF8F3]">
                            {tour.image_url && tour.image_url !== "NULL" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={tour.image_url}
                                alt={tour.title_en || "Tour image"}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[#B89450]">
                                <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            {tour.tour_type && (
                              <span className="absolute left-2.5 top-2.5 rounded-full bg-[#282722]/80 px-2.5 py-1 text-[11px] font-semibold text-[#D1B16A] backdrop-blur-xs">
                                {tour.tour_type}
                              </span>
                            )}
                            <span className="absolute right-2.5 top-2.5 rounded-full bg-[#282722]/85 px-2.5 py-1 text-[11px] font-bold font-mono text-[#D1B16A] shadow-xs backdrop-blur-xs">
                              {tourCode}
                            </span>
                          </div>

                          <h3 className="line-clamp-1 font-serif text-base font-bold text-[#282722]">
                            <span className="font-mono text-xs text-[#B89450] mr-1.5 font-bold">{tourCode}</span>
                            {tour.title_en || tour.title_zh || tour.title_th || `Tour #${tour.id}`}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs text-[#5D5A50]">
                            {tour.description_en || tour.description_zh || "No description provided."}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-[#E5E0D8] pt-3">
                          <div>
                            <span className="text-[11px] text-[#736E62]">Adult Price</span>
                            <p className="text-sm font-bold text-[#B89450]">
                              THB {tour.price ? Number(tour.price).toLocaleString() : "—"}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => startEdit(tour)}
                            className="rounded-lg border border-[#D6CEBD] bg-[#FAF8F3] px-3.5 py-1.5 text-xs font-semibold text-[#282722] hover:border-[#B89450] hover:bg-[#B89450] hover:text-white transition-colors"
                          >
                            Edit Tour →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
        ) : (
          /* ==================================================================== */
          /* EDIT TOUR FORM (Matching exact layout from user's image)             */
          /* ==================================================================== */
          <div ref={formRef} className="space-y-6">
            {/* Breadcrumb & Action Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#736E62]">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="hover:text-[#B89450]"
                  >
                    Tours
                  </button>
                  <span>›</span>
                  <span className="text-[#282722] font-semibold">
                    {editing
                      ? `Edit Tour [${getTourDisplayCode(editing, extendedMap[String(editing.id)], editing.id)}]`
                      : `New Tour`}
                  </span>
                </div>
                <h1 className="mt-1 font-serif text-2xl font-bold text-[#282722]">
                  {editing
                    ? `Edit Tour (${getTourDisplayCode(editing, extendedMap[String(editing.id)], editing.id)})`
                    : "Add Tour"}
                </h1>
                <p className="mt-0.5 text-xs text-[#5D5A50]">
                  Manage tour details, pricing, transfer options and more.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-[#D6CEBD] bg-white px-4 py-2 text-xs font-semibold text-[#5D5A50] hover:bg-[#FAF8F3] hover:text-[#282722] transition-colors"
                >
                  Cancel
                </button>

                {editing && (
                  <a
                    href={`/${locale}/tours/${editing.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-[#D6CEBD] bg-white px-4 py-2 text-xs font-semibold text-[#282722] hover:border-[#B89450] hover:text-[#B89450] transition-colors"
                  >
                    Preview Tour
                  </a>
                )}

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveTour()}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-5 py-2 text-xs font-bold text-[#282722] shadow-md shadow-[#B89450]/25 hover:brightness-105 disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Tour Header Summary Card */}
            <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
              <div className="grid gap-5 lg:grid-cols-[140px_1fr_210px]">
                {/* Thumbnail Preview */}
                <div className="relative h-28 w-full overflow-hidden rounded-xl border border-[#D6CEBD] bg-[#FAF8F3]">
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.image_url}
                      alt="Tour preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[#B89450]">
                      <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details Fields */}
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-[1.5fr_1.2fr_1.2fr_100px]">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Tour Name (English - Primary)
                      </label>
                      <input
                        type="text"
                        value={form.title_en ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, title_en: e.target.value }))
                        }
                        placeholder="e.g. Krabi 4 Islands Luxury Tour"
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Tour Type (5 Types)
                      </label>
                      <select
                        value={tourType}
                        onChange={(e) => setTourType(e.target.value as TourType)}
                        className="w-full rounded-lg border border-[#B89450] bg-[#FAF8F3] font-semibold px-3 py-1.5 text-xs text-[#17352A] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                      >
                        <option value="Tour Package">1. Tour Package (All services included)</option>
                        <option value="Ticket Only">2. Ticket Only (Selling attraction tickets)</option>
                        <option value="Transfer Only">3. Transfer Only (Airport/hotel transfer)</option>
                        <option value="Private Tour">4. Private Tour (Private charter/yacht)</option>
                        <option value="Activity Only">5. Activity Only (ATV, snorkeling, etc.)</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#17352A]">
                          Category &amp; Subcategory
                        </label>
                        <a
                          href={`/${locale}/admin/categories`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-[#B89450] hover:underline flex items-center gap-1"
                          title="Open Category Management in new tab"
                        >
                          <span>⚙️ Manage in Category Tab</span>
                          <span>↗</span>
                        </a>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 1. Category Dropdown */}
                        <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3]/50 p-3 space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#B89450]">
                            Category
                          </label>
                          <select
                            value={category}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              setCategory(newCat);
                              const subs = categoriesMap[newCat] || [];
                              if (subs.length > 0) {
                                setSubcategory(subs[0]);
                              } else {
                                setSubcategory("");
                              }
                            }}
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#282722] focus:border-[#B89450] focus:outline-none"
                          >
                            {Object.keys(categoriesMap).map((cat) => (
                              <option key={cat} value={cat}>
                                {cat} ({categoriesMap[cat]?.length || 0})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Subcategory Dropdown */}
                        <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3]/50 p-3 space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#B89450]">
                            Subcategory
                          </label>
                          <select
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#282722] focus:border-[#B89450] focus:outline-none"
                          >
                            {(categoriesMap[category] || []).length === 0 ? (
                              <option value="">No subcategories (manage in Category tab)</option>
                            ) : (
                              (categoriesMap[category] || []).map((sub) => (
                                <option key={sub} value={sub}>
                                  {sub}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      {/* 3. System Auto-Assigned Tour ID */}
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-[#B89450]/30 bg-[#FAF8F3] px-4 py-2.5 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-[#17352A]">Tour ID:</span>
                          <span className="rounded-md bg-[#17352A] px-2.5 py-1 font-mono text-xs font-bold text-[#D1B16A]">
                            {autoTourId}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Auto-assigned by system
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Status
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#B89450] transition-colors duration-200"
                        >
                          <span className="translate-x-4 inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200" />
                        </button>
                        <span className="text-xs font-medium text-[#282722]">Active</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Short Description (English - Primary)
                    </label>
                    <input
                      type="text"
                      value={form.description_en ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description_en: e.target.value }))
                      }
                      placeholder="e.g. Explore the beautiful islands in Krabi with a full-day luxury tour."
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload / Change Image Box */}
                <div>
                  <input
                    ref={tourImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleTourImageUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />

                  <button
                    type="button"
                    disabled={isUploadingTourImage}
                    onClick={() => tourImageInputRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#D6CEBD] bg-[#FAF8F3] p-3 text-center transition hover:border-[#B89450] hover:bg-white"
                  >
                    <svg className="h-6 w-6 text-[#B89450]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="mt-1 text-xs font-semibold text-[#282722]">
                      {isUploadingTourImage ? "Uploading..." : "Upload / Change Image"}
                    </span>
                    <span className="mt-0.5 text-[10px] text-[#736E62]">
                      JPG, PNG (Max 5MB)
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex border-b border-[#D6CEBD] text-xs overflow-x-auto">
              {[
                { id: "general", label: "General & Multilingual" },
                { id: "rules_info", label: "General Info & Rules" },
                { id: "custom_fields", label: "Dynamic Fields & Add-ons" },
                { id: "pricing", label: "Pricing & Rates" },
                {
                  id: "transfer",
                  label: tourType === "Ticket Only" ? "Transfer (N/A for Tickets)" : "Transfer & Pick-up",
                },
                { id: "itinerary", label: "Itinerary / Schedule" },
                { id: "images", label: "Pictures & Gallery" },
                { id: "seo", label: "SEO & Settings" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center border-b-2 px-5 py-3 font-medium transition ${
                      isActive
                        ? "border-[#B89450] bg-[#FAF8F3] text-[#B89450] font-bold"
                        : "border-transparent text-[#736E62] hover:text-[#282722] hover:bg-gray-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Transfer & Pick-up (The requested layout) */}
            {activeTab === "transfer" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* LEFT COLUMN: Transfer Option + Pick-up Locations Table + Additional Settings */}
                <div className="space-y-6">
                  {/* Card 1: Transfer Option */}
                  <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-[#282722]">Transfer Option</h2>
                          <p className="text-[11px] text-[#5D5A50]">
                            Set whether this tour offers hotel pick-up and configure pick-up locations and pricing.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEnableTransfer(!enableTransfer)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                            enableTransfer ? "bg-[#B89450]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                              enableTransfer ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs font-medium text-[#282722]">Enable Transfer</span>
                      </div>
                    </div>

                    {/* Pick-up Extra Fees Policy (Requirement: Only required if tour charges extra fees, otherwise every price included) */}
                    <div className="mt-4 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <label className="text-xs font-bold text-[#17352A]">
                          Pick-up Extra Fees Policy
                        </label>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#17352A] text-[#D1B16A]">
                          {!chargesExtraPickupFee ? "All-Inclusive Pricing" : "Extra Fee per Zone"}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label
                          className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition ${
                            !chargesExtraPickupFee
                              ? "border-[#B89450] bg-white ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white/60 hover:bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pickup_pricing_policy"
                            checked={!chargesExtraPickupFee}
                            onChange={() => setChargesExtraPickupFee(false)}
                            className="mt-0.5 text-[#B89450] focus:ring-[#B89450]"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#17352A] block">
                              All-Inclusive (Every price is included in the tour)
                            </span>
                            <span className="text-[11px] text-[#5D5A50] mt-0.5 block leading-relaxed">
                              Hotel pick-up is free or included in the base tour price. Selecting a paid pick-up location is not required from customers.
                            </span>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition ${
                            chargesExtraPickupFee
                              ? "border-[#B89450] bg-white ring-1 ring-[#B89450]"
                              : "border-[#D6CEBD] bg-white/60 hover:bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="pickup_pricing_policy"
                            checked={chargesExtraPickupFee}
                            onChange={() => setChargesExtraPickupFee(true)}
                            className="mt-0.5 text-[#B89450] focus:ring-[#B89450]"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#17352A] block">
                              Charges Extra Fees for Pick-up
                            </span>
                            <span className="text-[11px] text-[#5D5A50] mt-0.5 block leading-relaxed">
                              Pick-up location selection is strictly required to calculate extra pick-up fees based on hotel location zone.
                            </span>
                          </div>
                        </label>
                      </div>

                      {!chargesExtraPickupFee && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            Pick-up locations will only be required if extra fees apply. Otherwise, all prices are included in this tour!
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {/* Option A: No Transfer */}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTransferOption("no_transfer");
                        }}
                        className={`flex flex-col rounded-xl border p-4 text-left transition ${
                          previewTransferOption === "no_transfer"
                            ? "border-[#B89450] bg-[#FAF8F3] shadow-xs ring-1 ring-[#B89450]"
                            : "border-[#D6CEBD] bg-white hover:border-[#B89450]/60 hover:bg-[#FAF8F3]/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              previewTransferOption === "no_transfer"
                                ? "border-[#B89450]"
                                : "border-gray-400"
                            }`}
                          >
                            {previewTransferOption === "no_transfer" && (
                              <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#282722]">No Transfer</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#5D5A50]">
                          Travel to the meeting point by yourself
                        </p>
                        <span className="mt-2 text-[10px] text-[#8D846D]">
                          (Use base tour price)
                        </span>
                      </button>

                      {/* Option B: Transfer */}
                      <button
                        type="button"
                        disabled={!enableTransfer}
                        onClick={() => {
                          setPreviewTransferOption("transfer");
                        }}
                        className={`flex flex-col rounded-xl border p-4 text-left transition ${
                          !enableTransfer
                            ? "cursor-not-allowed opacity-40 border-[#D6CEBD] bg-gray-50"
                            : previewTransferOption === "transfer"
                            ? "border-[#B89450] bg-[#FAF8F3] shadow-xs ring-1 ring-[#B89450]"
                            : "border-[#D6CEBD] bg-white hover:border-[#B89450]/60 hover:bg-[#FAF8F3]/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              previewTransferOption === "transfer"
                                ? "border-[#B89450]"
                                : "border-gray-400"
                            }`}
                          >
                            {previewTransferOption === "transfer" && (
                              <div className="h-2 w-2 rounded-full bg-[#B89450]" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#282722]">Transfer</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#5D5A50]">Hotel pick-up</p>
                        <span className="mt-2 text-[10px] text-[#B89450] font-medium">
                          Show pick-up locations and price for this tour
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Pick-up Locations and Pricing */}
                  <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-[#282722]">
                            Pick-up Locations and Pricing
                          </h2>
                          <p className="text-[11px] text-[#5D5A50]">
                            Add pick-up locations available for this tour and set the price for each location.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openAddLocationModal}
                        className="rounded-lg bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-3.5 py-1.5 text-xs font-semibold text-[#282722] shadow-sm hover:brightness-105"
                      >
                        + Add Pick-up Location
                      </button>
                    </div>

                    {/* Table */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E0D8] bg-[#FAF8F3] text-[11px] text-[#5D5A50]">
                            <th className="py-2.5 pl-3 pr-2">#</th>
                            <th className="py-2.5 px-3">Pick-up Location</th>
                            <th className="py-2.5 px-3">Adult Price (THB)</th>
                            <th className="py-2.5 px-3">Child Price (THB)</th>
                            <th className="py-2.5 px-3">Notes</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 pr-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E0D8]">
                          {pickupLocations.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-gray-500">
                                No pick-up locations added yet. Click &quot;+ Add Pick-up Location&quot;.
                              </td>
                            </tr>
                          ) : (
                            pickupLocations.map((loc, idx) => (
                              <tr
                                key={loc.id || idx}
                                className="group hover:bg-[#FAF8F3]/60 transition-colors"
                              >
                                <td className="py-3 pl-3 pr-2 text-gray-400">
                                  <span className="cursor-grab text-gray-400 hover:text-[#282722]">
                                    ≡
                                  </span>{" "}
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3 font-semibold text-[#282722]">
                                  {loc.location_name}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-[#B89450]">
                                  {Number(loc.adult_price).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 font-mono text-[#5D5A50]">
                                  {Number(loc.child_price).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-[#736E62]">
                                  {loc.notes || "-"}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleLocationStatus(idx)}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                      loc.is_active ? "bg-[#B89450]" : "bg-gray-300"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${
                                        loc.is_active ? "translate-x-3" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </td>
                                <td className="py-3 pr-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditLocationModal(idx)}
                                      className="rounded border border-[#D6CEBD] bg-white p-1 text-[#5D5A50] hover:border-[#B89450] hover:text-[#B89450] transition-colors"
                                      title="Edit Location"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteLocation(idx)}
                                      className="rounded border border-[#D6CEBD] bg-white p-1 text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                                      title="Delete Location"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Card 3: Additional Meeting Points & Settings */}
                  <div className="rounded-2xl border border-[#D6CEBD] bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-[#282722]">
                          Additional Meeting Points & Settings
                        </h2>
                        <p className="text-[11px] text-[#5D5A50]">
                          Meeting point instructions and travel information for guests.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEnableMeetingPoint(!enableMeetingPoint)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                            enableMeetingPoint ? "bg-[#B89450]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                              enableMeetingPoint ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs font-medium text-[#282722]">
                          {enableMeetingPoint ? "Show Meeting Point" : "Hide Meeting Point"}
                        </span>
                      </div>
                    </div>

                    {!enableMeetingPoint ? (
                      <div className="mt-4 rounded-xl border border-dashed border-[#D6CEBD] bg-[#FAF8F3] p-4 text-center">
                        <p className="text-xs font-semibold text-[#5D5A50]">
                          Meeting Point section is optional and currently hidden for this tour.
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          Toggle the switch above to show meeting point instructions to customers.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Meeting Point (for No Transfer)
                          </label>
                          <input
                            type="text"
                            value={meetingPoint}
                            onChange={(e) => setMeetingPoint(e.target.value)}
                            placeholder="e.g. Ao Nang Pier"
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Meeting Time
                          </label>
                          <div className="relative">
                            <input
                              type="time"
                              value={meetingTime}
                              onChange={(e) => setMeetingTime(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Additional Notes
                          </label>
                          <input
                            type="text"
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            placeholder="e.g. Please arrive 15 minutes before departure"
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] placeholder-gray-400 focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Live Preview (Matching client booking view) */}
                <div>
                  <div className="sticky top-6">
                    <p className="mb-2 text-xs font-semibold text-[#5D5A50]">
                      Live Preview <span className="text-[11px] font-normal text-[#8D846D]">(How it appears to customers)</span>
                    </p>

                    <div className="overflow-hidden rounded-2xl border border-[#B89450]/35 bg-white p-5 shadow-lg text-[#282722]">
                      <h3 className="font-serif text-lg font-bold text-[#282722]">
                        {form.title_en || "Krabi Island Tour"}
                      </h3>

                      {/* 1. Transfer option */}
                      <div className="mt-4 border-t border-[#B89450]/20 pt-4">
                        <p className="text-xs font-bold text-[#282722]">
                          1. Transfer option
                        </p>
                        <div className="mt-2 space-y-2 text-xs">
                          <label
                            className="flex cursor-pointer items-center gap-2 text-[#282722]"
                            onClick={() => setPreviewTransferOption("no_transfer")}
                          >
                            <input
                              type="radio"
                              name="preview-transfer"
                              checked={previewTransferOption === "no_transfer"}
                              onChange={() => setPreviewTransferOption("no_transfer")}
                              className="accent-[#B89450]"
                            />
                            <span>No Transfer — {enableMeetingPoint ? "Travel to meeting point by yourself" : "Self-arrival / direct check-in"}</span>
                          </label>

                          <label
                            className={`flex cursor-pointer items-center gap-2 text-[#282722] ${
                              !enableTransfer ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            onClick={() => {
                              if (enableTransfer) setPreviewTransferOption("transfer");
                            }}
                          >
                            <input
                              type="radio"
                              name="preview-transfer"
                              disabled={!enableTransfer}
                              checked={previewTransferOption === "transfer"}
                              onChange={() => setPreviewTransferOption("transfer")}
                              className="accent-[#B89450]"
                            />
                            <span>Transfer — Hotel pick-up</span>
                          </label>
                        </div>
                      </div>

                      {/* 2. Pick-up location */}
                      {previewTransferOption === "transfer" && (
                        <div className="mt-4 border-t border-[#B89450]/20 pt-4">
                          <p className="text-xs font-bold text-[#282722]">
                            2. Pick-up location
                          </p>
                          <div className="mt-2 space-y-1.5 text-xs">
                            {activePickupLocations.length === 0 ? (
                              <p className="text-[11px] text-[#736E62]">
                                No active locations available.
                              </p>
                            ) : (
                              activePickupLocations.map((loc) => (
                                <label
                                  key={loc.id}
                                  className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] px-3 py-2 text-[#282722] hover:border-[#B89450] transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="preview-location"
                                      checked={previewSelectedLocationId === loc.id}
                                      onChange={() => setPreviewSelectedLocationId(loc.id)}
                                      className="accent-[#B89450]"
                                    />
                                    <span className="font-semibold text-[#282722]">
                                      {loc.location_name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-[#B89450]">
                                    THB {Number(loc.adult_price).toLocaleString()}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* If No Transfer: Show meeting point if enabled */}
                      {previewTransferOption === "no_transfer" && enableMeetingPoint && meetingPoint && (
                        <div className="mt-4 rounded-xl border border-[#B89450]/35 bg-[#FAF8F3] p-3 text-xs text-[#282722]">
                          <p className="font-bold text-[#B89450]">Meeting Point:</p>
                          <p className="mt-0.5">{meetingPoint} at <strong>{meetingTime}</strong></p>
                          {additionalNotes && (
                            <p className="mt-1 text-[11px] text-[#5D5A50]">
                              {additionalNotes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 3. Number of passengers */}
                      <div className="mt-4 border-t border-[#B89450]/20 pt-4">
                        <p className="text-xs font-bold text-[#282722]">
                          3. Number of passengers
                        </p>
                        <div className="mt-3 space-y-2.5">
                          {/* Adult */}
                          <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-2.5">
                            <div>
                              <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                                <AdultIcon className="w-3.5 h-3.5 text-[#B89450]" />
                                <span>Adult</span>
                              </p>
                              <p className="text-[11px] text-[#5D5A50] font-mono">
                                THB {previewEffectiveAdultPrice.toLocaleString()} / person
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewAdults((p) => Math.max(1, p - 1))
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722]"
                              >
                                −
                              </button>
                              <span className="w-4 text-center font-bold text-[#282722]">
                                {previewAdults}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewAdults((p) => p + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Child */}
                          <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-2.5">
                            <div>
                              <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                                <ChildIcon className="w-3.5 h-3.5 text-[#B89450]" />
                                <span>Child</span>
                                <span className="text-[10px] text-[#736E62]">
                                  ({form.child_age_min ?? 4}–{form.child_age_max ?? 11} yrs)
                                </span>
                              </p>
                              <p className="text-[11px] text-[#5D5A50] font-mono">
                                THB {previewEffectiveChildPrice.toLocaleString()} / person
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewChildren((p) => Math.max(0, p - 1))
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722]"
                              >
                                −
                              </button>
                              <span className="w-4 text-center font-bold text-[#282722]">
                                {previewChildren}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewChildren((p) => p + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Infant */}
                          <div className="flex items-center justify-between rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-2.5">
                            <div>
                              <p className="text-xs font-bold text-[#282722] flex items-center gap-1.5">
                                <InfantIcon className="w-3.5 h-3.5 text-[#B89450]" />
                                <span>Infant</span>
                                <span className="text-[10px] text-[#736E62]">
                                  ({form.infant_age_min ?? 0}–{form.infant_age_max ?? 2} yrs)
                                </span>
                              </p>
                              <p className="text-[11px] text-[#5D5A50] font-mono">
                                {previewInfantPrice > 0
                                  ? `THB ${previewInfantPrice.toLocaleString()} / person`
                                  : "Free"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                disabled={previewInfants <= 0}
                                onClick={() =>
                                  setPreviewInfants((p) => Math.max(0, p - 1))
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-[#282722] hover:border-[#282722] disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-4 text-center font-bold text-[#282722]">
                                {previewInfants}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewInfants((p) => p + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#B89450] bg-white text-sm font-bold text-[#B89450] hover:bg-[#B89450]/15"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Total and Book Now */}
                      <div className="mt-6 border-t border-[#B89450]/20 pt-4">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-medium text-[#5D5A50]">Estimated total</span>
                          <span className="text-xs font-mono font-semibold text-[#8D846D]">THB</span>
                        </div>
                        <p className="mt-1 font-serif text-3xl font-bold text-[#282722]">
                          THB {previewTotal.toLocaleString()}
                        </p>

                        <button
                          type="button"
                          className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#D1B16A] to-[#B89450] py-3 text-xs font-bold text-[#282722] shadow-md shadow-[#B89450]/25 hover:brightness-105"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: General Info */}
            {activeTab === "general" && (
              <div className="space-y-6 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                <h3 className="font-serif text-base font-bold text-[#282722]">
                  Tour Details & Multilingual Content
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Title (English)
                    </label>
                    <input
                      type="text"
                      value={form.title_en ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title_en: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Title (中文)
                    </label>
                    <input
                      type="text"
                      value={form.title_zh ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title_zh: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Title (ภาษาไทย)
                    </label>
                    <input
                      type="text"
                      value={form.title_th ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title_th: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Description (English)
                    </label>
                    <textarea
                      rows={4}
                      value={form.description_en ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description_en: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Description (中文)
                    </label>
                    <textarea
                      rows={4}
                      value={form.description_zh ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description_zh: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Description (ภาษาไทย)
                    </label>
                    <textarea
                      rows={4}
                      value={form.description_th ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description_th: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={form.destination ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, destination: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={form.duration ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, duration: e.target.value }))
                      }
                      placeholder="e.g. Full Day (8 hrs)"
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Operated Days
                    </label>
                    <input
                      type="text"
                      value={form.operated_days ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, operated_days: e.target.value }))
                      }
                      placeholder="e.g. Mon, Wed, Fri"
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Multilingual Important Info & Policies */}
                <div className="border-t border-[#E5E0D8] pt-4">
                  <h4 className="text-xs font-bold text-[#17352A] mb-3">
                    Important Information & Policies (Multilingual)
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Important Info (English - Primary)
                      </label>
                      <textarea
                        rows={3}
                        value={form.important_info_en ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, important_info_en: e.target.value }))
                        }
                        placeholder="Please arrive at pier 15 mins prior. Bring passport copy."
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Important Info (中文)
                      </label>
                      <textarea
                        rows={3}
                        value={form.important_info_zh ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, important_info_zh: e.target.value }))
                        }
                        placeholder="请提前15分钟到达码头。请携带护照复印件。"
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                        Important Info (ภาษาไทย)
                      </label>
                      <textarea
                        rows={3}
                        value={form.important_info_th ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, important_info_th: e.target.value }))
                        }
                        placeholder="กรุณามาถึงท่าเรือก่อนเวลา 15 นาที พร้อมสำเนาหนังสือเดินทาง"
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Fields Based on 5 Tour Types */}
                <div className="border-t border-[#E5E0D8] pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-full bg-[#17352A] px-2.5 py-0.5 text-[10px] font-bold text-[#D1B16A]">
                      Type Specific Settings: {tourType}
                    </span>
                  </div>

                  {tourType === "Ticket Only" && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">🎟</span>
                          <p className="text-xs font-bold text-emerald-950">
                            Ticket Only Admission & Show Schedule Settings
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-white border border-emerald-300 px-2 py-0.5 rounded-full">
                          Connected to Customer Booking Calendar & Show Slots
                        </span>
                      </div>

                      {/* 1. Show Times Manager */}
                      <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <span>🕒</span>
                            <span>Daily Show Times / Performance Sessions</span>
                          </label>
                          <p className="text-[11px] text-gray-500 mb-2">
                            Add the available show times for this attraction (e.g. 17:30, 19:30, 20:30). Customers will select their preferred time slot on booking.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          {(ticketDetails.show_times || []).map((st, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-900 shadow-2xs"
                            >
                              <span>🕒 {st}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setTicketDetails({
                                    ...ticketDetails,
                                    show_times: (ticketDetails.show_times || []).filter((_, i) => i !== sIdx),
                                  })
                                }
                                className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                                title="Remove show time"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          {(!ticketDetails.show_times || ticketDetails.show_times.length === 0) && (
                            <span className="text-xs text-gray-400 italic">No show times added yet. Add at least one below.</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newShowTimeInput}
                            onChange={(e) => setNewShowTimeInput(e.target.value)}
                            placeholder="e.g. 17:30 or 19:30 - Main Theatre"
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newShowTimeInput.trim()) return;
                              const updated = [...(ticketDetails.show_times || []), newShowTimeInput.trim()];
                              setTicketDetails({
                                ...ticketDetails,
                                show_times: updated,
                              });
                              setNewShowTimeInput("");
                            }}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                          >
                            + Add Show Time
                          </button>
                        </div>
                      </div>

                      {/* 2. Optional Transfer Add-on for Ticket Tours */}
                      <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ticketDetails.has_transfer_addon ?? true}
                              onChange={(e) =>
                                setTicketDetails({ ...ticketDetails, has_transfer_addon: e.target.checked })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                            />
                            <span className="text-xs font-bold text-gray-800">
                              Offer Optional Hotel Transfer Add-on to Customers
                            </span>
                          </label>
                          {ticketDetails.has_transfer_addon && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-gray-600">Transfer Price / Person:</span>
                              <input
                                type="number"
                                min="0"
                                value={ticketDetails.transfer_price ?? 350}
                                onChange={(e) =>
                                  setTicketDetails({ ...ticketDetails, transfer_price: Number(e.target.value) || 0 })
                                }
                                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs font-mono font-bold text-emerald-800 text-right"
                              />
                              <span className="text-xs text-gray-500 font-mono">THB</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">
                          When enabled, customers can choose either &quot;No Transfer&quot; or &quot;Transfer&quot; (with pickup location & hotel name inputs) directly on the booking page.
                        </p>
                      </div>

                      {/* 3. Ticket Pricing Unit */}
                      <div className="rounded-xl border border-emerald-200 bg-white p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <span>🎫</span>
                              <span>Ticket Pricing Unit (Display Suffix)</span>
                            </label>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Shown next to the price (e.g. &ldquo;/ ticket&rdquo;, &ldquo;/ admission pass&rdquo;, &ldquo;/ seat&rdquo;, &ldquo;/ day-pass&rdquo;).
                            </p>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. per ticket"
                            value={ticketDetails.unit || "per ticket"}
                            onChange={(e) => setTicketDetails({ ...ticketDetails, unit: e.target.value })}
                            className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"
                          />
                        </div>
                      </div>

                      {/* 4. Customizable Ticket Overview Specifications (Add, Edit, Remove fields freely) */}
                      <div className="rounded-xl border border-emerald-300 bg-white p-4 space-y-3.5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                              <span>⊕</span>
                              <span>Customizable Ticket Details & Specifications (Overview)</span>
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Add, edit, or remove fields based on this ticket&apos;s unique information (e.g. Venue, Seating, Gates Open, Dress Code, Lockers, Child Policy).
                            </p>
                          </div>
                          <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 font-mono self-start sm:self-auto">
                            {(ticketDetails.custom_details || []).length} Custom Fields
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5 bg-emerald-50/60 rounded-lg p-3 border border-emerald-200/70">
                          <span className="text-[11px] font-bold text-emerald-900 block">
                            Quick Add Common Presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "Attraction Venue", val: "Attraction Main Entrance, Phuket" },
                              { label: "Ticket Redemption Point", val: "Present digital e-voucher at Ticket Gate" },
                              { label: "Admission Operating Hours", val: "09:00 - 18:00 (Daily)" },
                              { label: "Ticket Validity", val: "Valid only on selected date during operating hours" },
                              { label: "Seating Zone / Category", val: "Standard / Royal Seat Available" },
                              { label: "Gates Open Time", val: "17:30" },
                              { label: "Show Duration", val: "70 Minutes" },
                              { label: "Dress Code", val: "Casual / Smart Casual" },
                              { label: "Child & Infant Policy", val: "Infants under 100 cm enter free" },
                              { label: "Lockers & Towel Rental", val: "RFID wristband lockers available" },
                              { label: "Wheelchair Accessibility", val: "Fully accessible with ramp access" },
                              { label: "Photography Rules", val: "Photography permitted without flash in theater" },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  const list = ticketDetails.custom_details || [];
                                  const exists = list.some(
                                    (f) => f.name_en.toLowerCase() === preset.label.toLowerCase()
                                  );
                                  if (!exists) {
                                    const newF: CustomField = {
                                      id: `td_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                      name_en: preset.label,
                                      value_en: preset.val,
                                    };
                                    setTicketDetails({
                                      ...ticketDetails,
                                      custom_details: [...list, newF],
                                    });
                                  }
                                }}
                                className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition"
                              >
                                + {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* List of Active Fields */}
                        <div className="space-y-2.5">
                          {(ticketDetails.custom_details || []).length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500">
                              No detail fields added yet. Click any Quick Preset above or type custom fields below.
                            </div>
                          ) : (
                            (ticketDetails.custom_details || []).map((field, fIdx) => (
                              <div
                                key={field.id || fIdx}
                                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 shadow-2xs hover:border-gray-300 transition"
                              >
                                <div className="w-full sm:w-1/3">
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
                                    Field Name
                                  </label>
                                  <input
                                    type="text"
                                    value={field.name_en}
                                    onChange={(e) => {
                                      const updated = [...(ticketDetails.custom_details || [])];
                                      updated[fIdx] = { ...updated[fIdx], name_en: e.target.value };
                                      setTicketDetails({ ...ticketDetails, custom_details: updated });
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-gray-900"
                                  />
                                </div>
                                <div className="w-full sm:flex-1">
                                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
                                    Value / Information
                                  </label>
                                  <input
                                    type="text"
                                    value={field.value_en}
                                    onChange={(e) => {
                                      const updated = [...(ticketDetails.custom_details || [])];
                                      updated[fIdx] = { ...updated[fIdx], value_en: e.target.value };
                                      setTicketDetails({ ...ticketDetails, custom_details: updated });
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-800"
                                  />
                                </div>
                                <div className="sm:self-end pb-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (ticketDetails.custom_details || []).filter((_, idx) => idx !== fIdx);
                                      setTicketDetails({ ...ticketDetails, custom_details: updated });
                                    }}
                                    className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition whitespace-nowrap"
                                    title="Remove this field"
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Form to Add Any Custom Field */}
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                          <span className="text-[11px] font-bold text-emerald-950 block">
                            + Add New Custom Field
                          </span>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              placeholder="Field Name (e.g. VIP Lounge Access, Unit)"
                              value={newTicketFieldLabel}
                              onChange={(e) => setNewTicketFieldLabel(e.target.value)}
                              className="w-full sm:w-1/3 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
                            />
                            <input
                              type="text"
                              placeholder="Field Value (e.g. Complimentary snacks & welcome drink)"
                              value={newTicketFieldValue}
                              onChange={(e) => setNewTicketFieldValue(e.target.value)}
                              className="w-full sm:flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newTicketFieldLabel.trim()) return;
                                const newF: CustomField = {
                                  id: `td_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                  name_en: newTicketFieldLabel.trim(),
                                  value_en: newTicketFieldValue.trim(),
                                };
                                setTicketDetails({
                                  ...ticketDetails,
                                  custom_details: [...(ticketDetails.custom_details || []), newF],
                                });
                                setNewTicketFieldLabel("");
                                setNewTicketFieldValue("");
                              }}
                              className="rounded-md bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shrink-0 shadow-2xs"
                            >
                              + Add Field
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tourType === "Transfer Only" && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                      <p className="text-xs font-bold text-indigo-900">
                        Transfer Only Route & Vehicle Settings
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                            Service Type
                          </label>
                          <select
                            value={transferDetails.service_type}
                            onChange={(e) => setTransferDetails({ ...transferDetails, service_type: e.target.value as any })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                          >
                            <option value="Airport Transfer">Airport Transfer (Inbound / Outbound)</option>
                            <option value="Hotel Transfer">Inter-Hotel Transfer</option>
                            <option value="Point-to-Point">Pier / Marina Point-to-Point</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                            Luggage Policy
                          </label>
                          <input
                            type="text"
                            value={transferDetails.luggage_policy}
                            onChange={(e) => setTransferDetails({ ...transferDetails, luggage_policy: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {tourType === "Activity Only" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                      <p className="text-xs font-bold text-amber-900">
                        Activity Only Settings (Individual Activity, ATV, Snorkeling, etc.)
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                            Activity Duration
                          </label>
                          <input
                            type="text"
                            value={activityDetails.duration}
                            onChange={(e) => setActivityDetails({ ...activityDetails, duration: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                            Session Slots (Comma separated)
                          </label>
                          <input
                            type="text"
                            value={activityDetails.session_slots.join(", ")}
                            onChange={(e) => setActivityDetails({
                              ...activityDetails,
                              session_slots: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            })}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {tourType === "Private Tour" && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                      <p className="text-xs font-bold text-purple-900">
                        Private Charter / VIP Charter Tour Settings
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                            Charter Type
                          </label>
                          <input
                            type="text"
                            defaultValue="Private Luxury Speedboat"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                            Max Passengers / Capacity
                          </label>
                          <input
                            type="number"
                            defaultValue={15}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: General Info & Rules (Fillable Form for Not Recommended, Include, Exclude, What to Bring with Trilingual Support) */}
            {activeTab === "rules_info" && (
              <div className="space-y-6 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E0D8] pb-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      General Information & Tour Package Rules
                    </h3>
                    <p className="text-xs text-[#5D5A50] mt-0.5">
                      Editable fillable form for guest safety requirements, inclusions, exclusions, and essential items to bring — fully supporting all 3 languages (English, ภาษาไทย, 中文).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Reset all 4 sections to trilingual standard presets?")) {
                          setNotRecommended(DEFAULT_NOT_RECOMMENDED_LOCALIZED.map(normalizeRuleItem));
                          setTourIncludes(DEFAULT_INCLUDES_LOCALIZED.map(normalizeRuleItem));
                          setTourExcludes(DEFAULT_EXCLUDES_LOCALIZED.map(normalizeRuleItem));
                          setWhatToBring(DEFAULT_WHAT_TO_BRING_LOCALIZED.map(normalizeRuleItem));
                          setEditingRule(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CEBD] bg-[#FAF8F3] px-3 py-1.5 text-xs font-semibold text-[#282722] hover:bg-[#B89450] hover:text-white transition"
                    >
                      <span>🔄</span>
                      <span>Load Trilingual Defaults</span>
                    </button>
                  </div>
                </div>

                {/* Section 1: Are Not Recommended */}
                <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-700">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h4 className="text-sm font-bold">1. Are Not Recommended (Safety & Health Restrictions)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-red-700 bg-white border border-red-200 px-2 py-0.5 rounded-full">
                      {notRecommended.length} restrictions
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Specify conditions where this tour is not recommended (e.g. Pregnant Women, People with Heart Conditions).
                  </p>

                  {/* List of items */}
                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    {notRecommended.map((item, idx) => {
                      const isEditing = editingRule?.section === "not_recommended" && editingRule?.index === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="sm:col-span-2 rounded-xl border border-red-400 bg-white p-3 shadow-md space-y-2">
                            <div className="flex items-center justify-between border-b border-red-100 pb-1.5">
                              <span className="text-xs font-bold text-red-800">Edit Restriction #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="text-xs text-gray-400 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English (EN)*</label>
                                <input
                                  type="text"
                                  value={editingRule.en}
                                  onChange={(e) => setEditingRule({ ...editingRule, en: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-red-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">ภาษาไทย (TH)</label>
                                <input
                                  type="text"
                                  value={editingRule.th}
                                  onChange={(e) => setEditingRule({ ...editingRule, th: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-red-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">中文 (ZH)</label>
                                <input
                                  type="text"
                                  value={editingRule.zh}
                                  onChange={(e) => setEditingRule({ ...editingRule, zh: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-red-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingRule.en.trim()) return;
                                  setNotRecommended(
                                    notRecommended.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            en: editingRule.en.trim(),
                                            th: editingRule.th.trim() || undefined,
                                            zh: editingRule.zh.trim() || undefined,
                                          }
                                        : it
                                    )
                                  );
                                  setEditingRule(null);
                                }}
                                className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex flex-col justify-between rounded-lg bg-white border border-red-300 p-2.5 text-xs text-red-900 shadow-2xs hover:border-red-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-red-900">
                              • {item.en}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRule({
                                    section: "not_recommended",
                                    index: idx,
                                    en: item.en,
                                    th: item.th || "",
                                    zh: item.zh || "",
                                  })
                                }
                                className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 transition"
                                title="Edit translations"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setNotRecommended(notRecommended.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-700 font-bold px-1"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-gray-600 border-t border-red-100/70 pt-1">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-red-800">🇹🇭 TH:</span>
                              <span className={item.th ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.th || "Not set"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-red-800">🇨🇳 ZH:</span>
                              <span className={item.zh ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.zh || "Not set"}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Item (Trilingual Input Fields) */}
                  <div className="rounded-xl border border-red-300/80 bg-white p-3.5 space-y-2 mt-2">
                    <p className="text-[11px] font-bold text-red-900 flex items-center gap-1.5">
                      <span>+</span>
                      <span>Add Health & Safety Restriction in 3 Languages</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          English (EN)*
                        </label>
                        <input
                          type="text"
                          value={newNotRecEn}
                          onChange={(e) => setNewNotRecEn(e.target.value)}
                          placeholder="e.g. People with Back Problems"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-red-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newNotRecEn.trim()) {
                              e.preventDefault();
                              setNotRecommended([
                                ...notRecommended,
                                {
                                  id: `nr_${Date.now()}`,
                                  en: newNotRecEn.trim(),
                                  th: newNotRecTh.trim() || undefined,
                                  zh: newNotRecZh.trim() || undefined,
                                },
                              ]);
                              setNewNotRecEn("");
                              setNewNotRecTh("");
                              setNewNotRecZh("");
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          ภาษาไทย (TH)
                        </label>
                        <input
                          type="text"
                          value={newNotRecTh}
                          onChange={(e) => setNewNotRecTh(e.target.value)}
                          placeholder="เช่น ผู้มีปัญหาเรื่องกระดูกหลัง"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-red-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          中文 (ZH)
                        </label>
                        <input
                          type="text"
                          value={newNotRecZh}
                          onChange={(e) => setNewNotRecZh(e.target.value)}
                          placeholder="例如 患有背部或腰椎疾病者"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-red-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (newNotRecEn.trim()) {
                            setNotRecommended([
                              ...notRecommended,
                              {
                                id: `nr_${Date.now()}`,
                                en: newNotRecEn.trim(),
                                th: newNotRecTh.trim() || undefined,
                                zh: newNotRecZh.trim() || undefined,
                              },
                            ]);
                            setNewNotRecEn("");
                            setNewNotRecTh("");
                            setNewNotRecZh("");
                          }
                        }}
                        className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                      >
                        + Add Restriction
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: Tour Include */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h4 className="text-sm font-bold">2. Tour Include (Package Inclusions)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                      {tourIncludes.length} inclusions
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Services, equipment, meals, and tickets included in the price.
                  </p>

                  {/* List of items */}
                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    {tourIncludes.map((item, idx) => {
                      const isEditing = editingRule?.section === "includes" && editingRule?.index === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="sm:col-span-2 rounded-xl border border-emerald-400 bg-white p-3 shadow-md space-y-2">
                            <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                              <span className="text-xs font-bold text-emerald-800">Edit Inclusion #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="text-xs text-gray-400 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English (EN)*</label>
                                <input
                                  type="text"
                                  value={editingRule.en}
                                  onChange={(e) => setEditingRule({ ...editingRule, en: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-emerald-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">ภาษาไทย (TH)</label>
                                <input
                                  type="text"
                                  value={editingRule.th}
                                  onChange={(e) => setEditingRule({ ...editingRule, th: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-emerald-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">中文 (ZH)</label>
                                <input
                                  type="text"
                                  value={editingRule.zh}
                                  onChange={(e) => setEditingRule({ ...editingRule, zh: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-emerald-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingRule.en.trim()) return;
                                  setTourIncludes(
                                    tourIncludes.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            en: editingRule.en.trim(),
                                            th: editingRule.th.trim() || undefined,
                                            zh: editingRule.zh.trim() || undefined,
                                          }
                                        : it
                                    )
                                  );
                                  setEditingRule(null);
                                }}
                                className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex flex-col justify-between rounded-lg bg-white border border-emerald-300 p-2.5 text-xs text-emerald-950 shadow-2xs hover:border-emerald-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-emerald-900">
                              ✓ {item.en}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRule({
                                    section: "includes",
                                    index: idx,
                                    en: item.en,
                                    th: item.th || "",
                                    zh: item.zh || "",
                                  })
                                }
                                className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                                title="Edit translations"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setTourIncludes(tourIncludes.filter((_, i) => i !== idx))}
                                className="text-emerald-400 hover:text-emerald-700 font-bold px-1"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-gray-600 border-t border-emerald-100/70 pt-1">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-emerald-800">🇹🇭 TH:</span>
                              <span className={item.th ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.th || "Not set"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-emerald-800">🇨🇳 ZH:</span>
                              <span className={item.zh ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.zh || "Not set"}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Inclusion */}
                  <div className="rounded-xl border border-emerald-300/80 bg-white p-3.5 space-y-2 mt-2">
                    <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>+</span>
                      <span>Add Package Inclusion in 3 Languages</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          English (EN)*
                        </label>
                        <input
                          type="text"
                          value={newIncludeEn}
                          onChange={(e) => setNewIncludeEn(e.target.value)}
                          placeholder="e.g. Delicious buffet lunch with vegetarian options"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-emerald-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newIncludeEn.trim()) {
                              e.preventDefault();
                              setTourIncludes([
                                ...tourIncludes,
                                {
                                  id: `inc_${Date.now()}`,
                                  en: newIncludeEn.trim(),
                                  th: newIncludeTh.trim() || undefined,
                                  zh: newIncludeZh.trim() || undefined,
                                },
                              ]);
                              setNewIncludeEn("");
                              setNewIncludeTh("");
                              setNewIncludeZh("");
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          ภาษาไทย (TH)
                        </label>
                        <input
                          type="text"
                          value={newIncludeTh}
                          onChange={(e) => setNewIncludeTh(e.target.value)}
                          placeholder="เช่น บุฟเฟต์อาหารกลางวันแสนอร่อยพร้อมตัวเลือกมังสวิรัติ"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          中文 (ZH)
                        </label>
                        <input
                          type="text"
                          value={newIncludeZh}
                          onChange={(e) => setNewIncludeZh(e.target.value)}
                          placeholder="例如 丰富美味的自助午餐（含素食选项）"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (newIncludeEn.trim()) {
                            setTourIncludes([
                              ...tourIncludes,
                              {
                                id: `inc_${Date.now()}`,
                                en: newIncludeEn.trim(),
                                th: newIncludeTh.trim() || undefined,
                                zh: newIncludeZh.trim() || undefined,
                              },
                            ]);
                            setNewIncludeEn("");
                            setNewIncludeTh("");
                            setNewIncludeZh("");
                          }
                        }}
                        className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                      >
                        + Add Inclusion
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 3: Tour Exclusions */}
                <div className="rounded-xl border border-gray-300 bg-gray-50/60 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-800">
                      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <h4 className="text-sm font-bold">3. Tour Exclusions (What is Not Included)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 bg-white border border-gray-300 px-2 py-0.5 rounded-full">
                      {tourExcludes.length} exclusions
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Items or fees not covered by the tour price (e.g. Gratuities & tips, souvenirs, alcohol).
                  </p>

                  {/* List of items */}
                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    {tourExcludes.map((item, idx) => {
                      const isEditing = editingRule?.section === "excludes" && editingRule?.index === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="sm:col-span-2 rounded-xl border border-gray-400 bg-white p-3 shadow-md space-y-2">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                              <span className="text-xs font-bold text-gray-800">Edit Exclusion #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="text-xs text-gray-400 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English (EN)*</label>
                                <input
                                  type="text"
                                  value={editingRule.en}
                                  onChange={(e) => setEditingRule({ ...editingRule, en: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-gray-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">ภาษาไทย (TH)</label>
                                <input
                                  type="text"
                                  value={editingRule.th}
                                  onChange={(e) => setEditingRule({ ...editingRule, th: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-gray-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">中文 (ZH)</label>
                                <input
                                  type="text"
                                  value={editingRule.zh}
                                  onChange={(e) => setEditingRule({ ...editingRule, zh: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-gray-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingRule.en.trim()) return;
                                  setTourExcludes(
                                    tourExcludes.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            en: editingRule.en.trim(),
                                            th: editingRule.th.trim() || undefined,
                                            zh: editingRule.zh.trim() || undefined,
                                          }
                                        : it
                                    )
                                  );
                                  setEditingRule(null);
                                }}
                                className="rounded bg-gray-700 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex flex-col justify-between rounded-lg bg-white border border-gray-300 p-2.5 text-xs text-gray-800 shadow-2xs hover:border-gray-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-700">
                              — {item.en}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRule({
                                    section: "excludes",
                                    index: idx,
                                    en: item.en,
                                    th: item.th || "",
                                    zh: item.zh || "",
                                  })
                                }
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 hover:bg-gray-200 transition"
                                title="Edit translations"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setTourExcludes(tourExcludes.filter((_, i) => i !== idx))}
                                className="text-gray-400 hover:text-gray-700 font-bold px-1"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-gray-600 border-t border-gray-100 pt-1">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-700">🇹🇭 TH:</span>
                              <span className={item.th ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.th || "Not set"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-gray-700">🇨🇳 ZH:</span>
                              <span className={item.zh ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.zh || "Not set"}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Exclusion */}
                  <div className="rounded-xl border border-gray-300 bg-white p-3.5 space-y-2 mt-2">
                    <p className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                      <span>+</span>
                      <span>Add Tour Exclusion in 3 Languages</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          English (EN)*
                        </label>
                        <input
                          type="text"
                          value={newExcludeEn}
                          onChange={(e) => setNewExcludeEn(e.target.value)}
                          placeholder="e.g. Gratuities & tips for tour guide and boat captain"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-gray-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newExcludeEn.trim()) {
                              e.preventDefault();
                              setTourExcludes([
                                ...tourExcludes,
                                {
                                  id: `exc_${Date.now()}`,
                                  en: newExcludeEn.trim(),
                                  th: newExcludeTh.trim() || undefined,
                                  zh: newExcludeZh.trim() || undefined,
                                },
                              ]);
                              setNewExcludeEn("");
                              setNewExcludeTh("");
                              setNewExcludeZh("");
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          ภาษาไทย (TH)
                        </label>
                        <input
                          type="text"
                          value={newExcludeTh}
                          onChange={(e) => setNewExcludeTh(e.target.value)}
                          placeholder="เช่น ทิปมัคคุเทศก์และกัปตันเรือตามความพึงพอใจ"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-gray-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          中文 (ZH)
                        </label>
                        <input
                          type="text"
                          value={newExcludeZh}
                          onChange={(e) => setNewExcludeZh(e.target.value)}
                          placeholder="例如 导游及船长小费（自愿原则）"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-gray-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (newExcludeEn.trim()) {
                            setTourExcludes([
                              ...tourExcludes,
                              {
                                id: `exc_${Date.now()}`,
                                en: newExcludeEn.trim(),
                                th: newExcludeTh.trim() || undefined,
                                zh: newExcludeZh.trim() || undefined,
                              },
                            ]);
                            setNewExcludeEn("");
                            setNewExcludeTh("");
                            setNewExcludeZh("");
                          }
                        }}
                        className="rounded-lg bg-gray-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition"
                      >
                        + Add Exclusion
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 4: What to Bring */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900">
                      <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h4 className="text-sm font-bold">4. What to Bring (Packing Checklist)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-900 bg-white border border-amber-300 px-2 py-0.5 rounded-full">
                      {whatToBring.length} items
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Items guests should pack for the tour (e.g. Sunscreen, Swimwear, Passport copy).
                  </p>

                  {/* List of items */}
                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    {whatToBring.map((item, idx) => {
                      const isEditing = editingRule?.section === "what_to_bring" && editingRule?.index === idx;

                      if (isEditing) {
                        return (
                          <div key={idx} className="sm:col-span-2 rounded-xl border border-amber-400 bg-white p-3 shadow-md space-y-2">
                            <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                              <span className="text-xs font-bold text-amber-900">Edit Item #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="text-xs text-gray-400 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English (EN)*</label>
                                <input
                                  type="text"
                                  value={editingRule.en}
                                  onChange={(e) => setEditingRule({ ...editingRule, en: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-amber-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">ภาษาไทย (TH)</label>
                                <input
                                  type="text"
                                  value={editingRule.th}
                                  onChange={(e) => setEditingRule({ ...editingRule, th: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-amber-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">中文 (ZH)</label>
                                <input
                                  type="text"
                                  value={editingRule.zh}
                                  onChange={(e) => setEditingRule({ ...editingRule, zh: e.target.value })}
                                  className="w-full rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-amber-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRule(null)}
                                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingRule.en.trim()) return;
                                  setWhatToBring(
                                    whatToBring.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            en: editingRule.en.trim(),
                                            th: editingRule.th.trim() || undefined,
                                            zh: editingRule.zh.trim() || undefined,
                                          }
                                        : it
                                    )
                                  );
                                  setEditingRule(null);
                                }}
                                className="rounded bg-[#B89450] px-3 py-1 text-xs font-semibold text-white hover:bg-[#A38240]"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex flex-col justify-between rounded-lg bg-white border border-amber-300 p-2.5 text-xs text-amber-950 shadow-2xs hover:border-amber-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-amber-950">
                              🎒 {item.en}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRule({
                                    section: "what_to_bring",
                                    index: idx,
                                    en: item.en,
                                    th: item.th || "",
                                    zh: item.zh || "",
                                  })
                                }
                                className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition"
                                title="Edit translations"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setWhatToBring(whatToBring.filter((_, i) => i !== idx))}
                                className="text-amber-400 hover:text-amber-700 font-bold px-1"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-gray-600 border-t border-amber-100/70 pt-1">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-amber-900">🇹🇭 TH:</span>
                              <span className={item.th ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.th || "Not set"}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-amber-900">🇨🇳 ZH:</span>
                              <span className={item.zh ? "text-gray-800" : "text-gray-400 italic"}>
                                {item.zh || "Not set"}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Item to Bring */}
                  <div className="rounded-xl border border-amber-300/80 bg-white p-3.5 space-y-2 mt-2">
                    <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <span>+</span>
                      <span>Add Essential Item in 3 Languages</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          English (EN)*
                        </label>
                        <input
                          type="text"
                          value={newBringEn}
                          onChange={(e) => setNewBringEn(e.target.value)}
                          placeholder="e.g. Reef-safe sunscreen, sunglasses, and sun hat"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-amber-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newBringEn.trim()) {
                              e.preventDefault();
                              setWhatToBring([
                                ...whatToBring,
                                {
                                  id: `wtb_${Date.now()}`,
                                  en: newBringEn.trim(),
                                  th: newBringTh.trim() || undefined,
                                  zh: newBringZh.trim() || undefined,
                                },
                              ]);
                              setNewBringEn("");
                              setNewBringTh("");
                              setNewBringZh("");
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          ภาษาไทย (TH)
                        </label>
                        <input
                          type="text"
                          value={newBringTh}
                          onChange={(e) => setNewBringTh(e.target.value)}
                          placeholder="เช่น ครีมกันแดด แว่นกันแดด และหมวก"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                          中文 (ZH)
                        </label>
                        <input
                          type="text"
                          value={newBringZh}
                          onChange={(e) => setNewBringZh(e.target.value)}
                          placeholder="例如 环保防晒霜、太阳镜及遮阳帽"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (newBringEn.trim()) {
                            setWhatToBring([
                              ...whatToBring,
                              {
                                id: `wtb_${Date.now()}`,
                                en: newBringEn.trim(),
                                th: newBringTh.trim() || undefined,
                                zh: newBringZh.trim() || undefined,
                              },
                            ]);
                            setNewBringEn("");
                            setNewBringTh("");
                            setNewBringZh("");
                          }
                        }}
                        className="rounded-lg bg-[#B89450] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#A38240] transition"
                      >
                        + Add Item to Bring
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Dynamic Custom Fields & Add-ons */}
            {activeTab === "custom_fields" && (
              <div className="space-y-6">
                {/* 1. Dynamic Key-Value Extra Specifications */}
                <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#E5E0D8] pb-3">
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      Dynamic Extra Fields (Overview & Specifications)
                    </h3>
                    <p className="text-xs text-[#5D5A50]">
                      Add custom key-value specifications shown on the client-side tour details page (e.g. Field Name: &ldquo;Tour Guide&rdquo;, Value: &ldquo;Chinese & English&rdquo;).
                    </p>
                  </div>

                  {/* List of Custom Fields */}
                  <div className="space-y-2">
                    {customFields.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-500">
                        No extra fields added yet. Add one below.
                      </p>
                    ) : (
                      customFields.map((field, idx) => (
                        <div
                          key={field.id || idx}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3 text-xs"
                        >
                          <div className="grid gap-1 sm:grid-cols-2 flex-1">
                            <div>
                              <span className="font-bold text-[#17352A] block">
                                {field.name_en}
                              </span>
                              {(field.name_th || field.name_zh) && (
                                <span className="text-[10px] text-gray-400 block">
                                  TH: {field.name_th || "—"} | ZH: {field.name_zh || "—"}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[#5D5A50] font-medium block">
                                {field.value_en}
                              </span>
                              {(field.value_th || field.value_zh) && (
                                <span className="text-[10px] text-gray-400 block">
                                  TH: {field.value_th || "—"} | ZH: {field.value_zh || "—"}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFields(customFields.filter((_, i) => i !== idx))
                            }
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1 shrink-0"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Custom Field Form */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                    <h4 className="text-xs font-bold text-[#17352A]">
                      + Add New Dynamic Field
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Field Name (English)*
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tour Guide Language"
                          value={newFieldNameEn}
                          onChange={(e) => setNewFieldNameEn(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Field Name (ภาษาไทย)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ภาษาของไกด์"
                          value={newFieldNameTh}
                          onChange={(e) => setNewFieldNameTh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Field Name (中文)
                        </label>
                        <input
                          type="text"
                          placeholder="例如 导游语言"
                          value={newFieldNameZh}
                          onChange={(e) => setNewFieldNameZh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Field Value (English)*
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Chinese & English Speaking"
                          value={newFieldValueEn}
                          onChange={(e) => setNewFieldValueEn(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Field Value (ภาษาไทย)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น สื่อสารภาษาจีนและอังกฤษ"
                          value={newFieldValueTh}
                          onChange={(e) => setNewFieldValueTh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Field Value (中文)
                        </label>
                        <input
                          type="text"
                          placeholder="例如 中英文持证导游全程陪同"
                          value={newFieldValueZh}
                          onChange={(e) => setNewFieldValueZh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFieldNameEn.trim() || !newFieldValueEn.trim()) return;
                          setCustomFields([
                            ...customFields,
                            {
                              id: `cf_${Date.now()}`,
                              name_en: newFieldNameEn.trim(),
                              name_th: newFieldNameTh.trim() || undefined,
                              name_zh: newFieldNameZh.trim() || undefined,
                              value_en: newFieldValueEn.trim(),
                              value_th: newFieldValueTh.trim() || undefined,
                              value_zh: newFieldValueZh.trim() || undefined,
                            },
                          ]);
                          setNewFieldNameEn("");
                          setNewFieldNameTh("");
                          setNewFieldNameZh("");
                          setNewFieldValueEn("");
                          setNewFieldValueTh("");
                          setNewFieldValueZh("");
                        }}
                        className="rounded-lg bg-[#B89450] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition"
                      >
                        + Add Dynamic Field
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Custom Ticket Tiers */}
                <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#E5E0D8] pb-3">
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      Custom Ticket Tiers & Categories
                    </h3>
                    <p className="text-xs text-[#5D5A50]">
                      Define specialized admission ticket options (e.g. VIP Pass, Fast Track Admission, Sunset Deck).
                    </p>
                  </div>

                  {/* List of Ticket Types */}
                  <div className="space-y-2">
                    {ticketTypes.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-500">
                        No custom ticket tiers added yet (Standard pricing will apply).
                      </p>
                    ) : (
                      ticketTypes.map((tier, idx) => {
                        const adultVal = tier.adult_price ?? tier.price;
                        const childVal = tier.child_price ?? adultVal;
                        return (
                          <div
                            key={tier.id || idx}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#17352A]">
                                {tier.name_en}
                              </span>
                              <span className="ml-2 font-mono font-bold text-[#B89450]">
                                Adult: THB {adultVal.toLocaleString()}
                              </span>
                              <span className="ml-2 font-mono font-bold text-[#8C6D2D]">
                                • Child: THB {childVal.toLocaleString()}
                              </span>
                              {tier.description_en && (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {tier.description_en}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setTicketTypes(ticketTypes.filter((_, i) => i !== idx))
                              }
                              className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Preset Ticket Templates */}
                  <div className="rounded-xl border border-dashed border-[#B89450]/40 bg-[#FFFDF9] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#17352A] flex items-center gap-1.5">
                        <span>⚡</span> Quick Add Preset Ticket Types
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Click to instantly add standard ticket options
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TICKET_TYPES.map((preset, pIdx) => {
                        const adultVal = preset.adult_price ?? preset.price;
                        const childVal = preset.child_price ?? adultVal;
                        return (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setTicketTypes((prev) => [
                                ...prev,
                                {
                                  id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  name_en: preset.name_en,
                                  name_th: preset.name_th,
                                  name_zh: preset.name_zh,
                                  price: adultVal,
                                  adult_price: adultVal,
                                  child_price: childVal,
                                  description_en: preset.description_en,
                                  description_th: preset.description_th,
                                  description_zh: preset.description_zh,
                                },
                              ]);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D6CEBD] bg-white hover:bg-[#FAF8F3] hover:border-[#B89450] text-[11px] font-medium text-[#282722] shadow-2xs transition-colors"
                          >
                            <span className="text-emerald-600 font-bold">+</span>
                            <span>{preset.name_en}</span>
                            <span className="text-[10px] text-[#B89450] font-mono">
                              Adult: ฿{adultVal.toLocaleString()}
                            </span>
                            {preset.child_price != null && (
                              <span className="text-[10px] text-[#8C6D2D] font-mono">
                                • Child: ฿{childVal.toLocaleString()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Ticket Tier Form */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                    <h4 className="text-xs font-bold text-[#17352A]">
                      + Add Ticket Tier
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Ticket Name (EN)*
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Park Admission & Buffet Dinner"
                          value={newTicketNameEn}
                          onChange={(e) => setNewTicketNameEn(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Ticket Name (ภาษาไทย)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น บัตรเข้าชม + บุฟเฟต์อาหารค่ำ"
                          value={newTicketNameTh}
                          onChange={(e) => setNewTicketNameTh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Ticket Name (中文)
                        </label>
                        <input
                          type="text"
                          placeholder="例如 入园门票 + 豪华自助晚餐"
                          value={newTicketNameZh}
                          onChange={(e) => setNewTicketNameZh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Adult Ticket Price (THB)*
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 2500"
                          value={newTicketPrice}
                          onChange={(e) =>
                            setNewTicketPrice(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Child Ticket Price (THB) (Height 101–140cm)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 2400 (Defaults to adult price if empty)"
                          value={newTicketChildPrice}
                          onChange={(e) =>
                            setNewTicketChildPrice(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                        Short Description / Inclusions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Full park admission plus grand international buffet dinner (Child: 101-140 cm)"
                        value={newTicketDescEn}
                        onChange={(e) => setNewTicketDescEn(e.target.value)}
                        className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTicketNameEn.trim() || newTicketPrice === "") return;
                          const adultVal = Number(newTicketPrice);
                          const childVal = newTicketChildPrice === "" ? adultVal : Number(newTicketChildPrice);
                          setTicketTypes([
                            ...ticketTypes,
                            {
                              id: `ticket_${Date.now()}`,
                              name_en: newTicketNameEn.trim(),
                              name_th: newTicketNameTh.trim() || undefined,
                              name_zh: newTicketNameZh.trim() || undefined,
                              price: adultVal,
                              adult_price: adultVal,
                              child_price: childVal,
                              description_en: newTicketDescEn.trim() || undefined,
                            },
                          ]);
                          setNewTicketNameEn("");
                          setNewTicketNameTh("");
                          setNewTicketNameZh("");
                          setNewTicketPrice("");
                          setNewTicketChildPrice("");
                          setNewTicketDescEn("");
                        }}
                        className="rounded-lg bg-[#B89450] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition"
                      >
                        + Add Ticket Tier
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Optional Tour Add-ons / Extras */}
                <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#E5E0D8] pb-3">
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      Optional Tour Add-ons (Extras)
                    </h3>
                    <p className="text-xs text-[#5D5A50]">
                      Additional options customers can check during booking (e.g. Snorkeling Gear Rental, Seafood Buffet Upgrade, Private Photo Session).
                    </p>
                  </div>

                  {/* List of Addons */}
                  <div className="space-y-2">
                    {optionalAddons.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-500">
                        No optional add-ons configured yet.
                      </p>
                    ) : (
                      optionalAddons.map((addon, idx) => (
                        <div
                          key={addon.id || idx}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#17352A]">
                              {addon.name_en}
                            </span>
                            <span className="ml-2 font-mono font-bold text-[#B89450]">
                              +THB {addon.price.toLocaleString()} ({addon.price_type === "per_person" ? "Per Person" : "Per Booking"})
                            </span>
                            {addon.description_en && (
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {addon.description_en}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setOptionalAddons(optionalAddons.filter((_, i) => i !== idx))
                            }
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Optional Addon Form */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                    <h4 className="text-xs font-bold text-[#17352A]">
                      + Add Optional Add-on
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Add-on Name (EN)*
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Snorkel Gear Rental"
                          value={newAddonNameEn}
                          onChange={(e) => setNewAddonNameEn(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Add-on Name (ภาษาไทย)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น เช่าอุปกรณ์ดำน้ำ"
                          value={newAddonNameTh}
                          onChange={(e) => setNewAddonNameTh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Add-on Name (中文)
                        </label>
                        <input
                          type="text"
                          placeholder="例如 浮潜装备租赁"
                          value={newAddonNameZh}
                          onChange={(e) => setNewAddonNameZh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Price (THB)*
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 250"
                          value={newAddonPrice}
                          onChange={(e) =>
                            setNewAddonPrice(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Pricing Basis
                        </label>
                        <select
                          value={newAddonPriceType}
                          onChange={(e) =>
                            setNewAddonPriceType(
                              e.target.value as "per_person" | "per_booking"
                            )
                          }
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        >
                          <option value="per_person">Per Person (Calculated by guest count)</option>
                          <option value="per_booking">Per Booking (Flat rate per reservation)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Includes sanitized silicone mask and snorkel"
                          value={newAddonDescEn}
                          onChange={(e) => setNewAddonDescEn(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newAddonNameEn.trim() || newAddonPrice === "") return;
                          setOptionalAddons([
                            ...optionalAddons,
                            {
                              id: `addon_${Date.now()}`,
                              name_en: newAddonNameEn.trim(),
                              name_th: newAddonNameTh.trim() || undefined,
                              name_zh: newAddonNameZh.trim() || undefined,
                              price: Number(newAddonPrice),
                              price_type: newAddonPriceType,
                              description_en: newAddonDescEn.trim() || undefined,
                            },
                          ]);
                          setNewAddonNameEn("");
                          setNewAddonNameTh("");
                          setNewAddonNameZh("");
                          setNewAddonPrice("");
                          setNewAddonDescEn("");
                        }}
                        className="rounded-lg bg-[#B89450] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition"
                      >
                        + Add Optional Add-on
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Dynamic Custom Booking Questions */}
                <div className="rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#E5E0D8] pb-3">
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      Custom Booking Questions / Fields
                    </h3>
                    <p className="text-xs text-[#5D5A50]">
                      Customize special information to collect from travelers during checkout (e.g. Dietary preference, Emergency contact, Hotel room number).
                    </p>
                  </div>

                  {/* List of Custom Booking Fields */}
                  <div className="space-y-2">
                    {customBookingFields.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-500">
                        No custom booking questions added yet.
                      </p>
                    ) : (
                      customBookingFields.map((cbf, idx) => (
                        <div
                          key={cbf.id || idx}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#17352A]">
                              {cbf.label_en}
                            </span>
                            {cbf.required && (
                              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                Required
                              </span>
                            )}
                            {cbf.placeholder_en && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Placeholder: &ldquo;{cbf.placeholder_en}&rdquo;
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomBookingFields(
                                customBookingFields.filter((_, i) => i !== idx)
                              )
                            }
                            className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Custom Booking Field Form */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                    <h4 className="text-xs font-bold text-[#17352A]">
                      + Add Booking Question
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Question Label (EN)*
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dietary Preferences"
                          value={newCbfLabelEn}
                          onChange={(e) => setNewCbfLabelEn(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Question Label (ภาษาไทย)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ข้อจำกัดด้านอาหาร"
                          value={newCbfLabelTh}
                          onChange={(e) => setNewCbfLabelTh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Question Label (中文)
                        </label>
                        <input
                          type="text"
                          placeholder="例如 饮食特殊要求/过敏"
                          value={newCbfLabelZh}
                          onChange={(e) => setNewCbfLabelZh(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 items-center">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                          Placeholder Hint
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Vegetarian, Halal, No Seafood"
                          value={newCbfPlaceholder}
                          onChange={(e) => setNewCbfPlaceholder(e.target.value)}
                          className="w-full rounded border border-[#D6CEBD] bg-white px-2.5 py-1.5 text-xs text-[#282722]"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="cbfRequired"
                          checked={newCbfRequired}
                          onChange={(e) => setNewCbfRequired(e.target.checked)}
                          className="h-4 w-4 rounded border-[#D6CEBD] text-[#B89450] focus:ring-[#B89450]"
                        />
                        <label
                          htmlFor="cbfRequired"
                          className="text-xs font-semibold text-[#282722]"
                        >
                          Mark as required field
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCbfLabelEn.trim()) return;
                          setCustomBookingFields([
                            ...customBookingFields,
                            {
                              id: `cbf_${Date.now()}`,
                              label_en: newCbfLabelEn.trim(),
                              label_th: newCbfLabelTh.trim() || undefined,
                              label_zh: newCbfLabelZh.trim() || undefined,
                              field_type: "text",
                              placeholder_en: newCbfPlaceholder.trim() || undefined,
                              required: newCbfRequired,
                            },
                          ]);
                          setNewCbfLabelEn("");
                          setNewCbfLabelTh("");
                          setNewCbfLabelZh("");
                          setNewCbfPlaceholder("");
                          setNewCbfRequired(false);
                        }}
                        className="rounded-lg bg-[#B89450] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition"
                      >
                        + Add Booking Question
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Itinerary */}
            {activeTab === "itinerary" && (
              <div className="space-y-6 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      Tour Schedule & Activities
                    </h3>
                    <p className="text-xs text-[#5D5A50]">
                      Add timeline items with pictures for tour #{editing?.id || "New"}.
                    </p>
                  </div>
                </div>

                {itineraryMessage && (
                  <p className="rounded-lg border border-[#B89450]/30 bg-[#FAF8F3] p-3 text-xs text-[#855D10]">
                    {itineraryMessage}
                  </p>
                )}

                {/* Itinerary List */}
                <div className="space-y-3">
                  {itinerary.length === 0 ? (
                    <p className="py-6 text-center text-xs text-gray-500">
                      No schedule items yet. Add one below.
                    </p>
                  ) : (
                    itinerary.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 sm:flex-row sm:items-center"
                      >
                        <span className="font-mono text-xs font-bold text-[#B89450]">
                          {item.time || "—"}
                        </span>
                        {item.image_signed_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_signed_url}
                            alt="Activity"
                            className="h-14 w-20 rounded-lg border border-[#D6CEBD] object-cover"
                          />
                        )}
                        <div className="flex-1 text-xs space-y-0.5">
                          <p className="font-semibold text-[#282722]">EN: {item.activity_en || "—"}</p>
                          {item.activity_th && (
                            <p className="text-[#5D5A50]">TH: {item.activity_th}</p>
                          )}
                          {item.activity_zh && (
                            <p className="text-[#5D5A50]">ZH: {item.activity_zh}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItineraryId(item.id);
                              setItineraryDraft({
                                time: item.time || "",
                                activity_en: item.activity_en || "",
                                activity_zh: item.activity_zh || "",
                                activity_th: item.activity_th || "",
                                image_url: item.image_url || "",
                                image_signed_url: item.image_signed_url || "",
                              });
                            }}
                            className="rounded border border-[#D6CEBD] bg-white px-2.5 py-1 text-xs font-semibold text-[#282722] hover:border-[#B89450] hover:text-[#B89450] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteItineraryItem(item.id)}
                            className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add / Edit Draft Section */}
                <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4">
                  <h4 className="mb-3 text-xs font-bold text-[#282722]">
                    {editingItineraryId ? "Edit Schedule Item (3 Languages)" : "Add Schedule Item (3 Languages)"}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 08:30 – 09:00"
                        value={itineraryDraft.time}
                        onChange={(e) =>
                          setItineraryDraft((p) => ({ ...p, time: e.target.value }))
                        }
                        className="w-full rounded border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">Activity (English)*</label>
                      <input
                        type="text"
                        placeholder="Activity in English"
                        value={itineraryDraft.activity_en}
                        onChange={(e) =>
                          setItineraryDraft((p) => ({ ...p, activity_en: e.target.value }))
                        }
                        className="w-full rounded border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">Activity (ภาษาไทย)</label>
                      <input
                        type="text"
                        placeholder="กิจกรรมภาษาไทย"
                        value={itineraryDraft.activity_th}
                        onChange={(e) =>
                          setItineraryDraft((p) => ({ ...p, activity_th: e.target.value }))
                        }
                        className="w-full rounded border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">Activity (中文)</label>
                      <input
                        type="text"
                        placeholder="行程活动中文"
                        value={itineraryDraft.activity_zh}
                        onChange={(e) =>
                          setItineraryDraft((p) => ({ ...p, activity_zh: e.target.value }))
                        }
                        className="w-full rounded border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Activity Image file upload */}
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-[#5D5A50]">
                      Activity Image (Upload JPG, PNG, WEBP)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadItineraryImage(file);
                        e.currentTarget.value = "";
                      }}
                      className="mt-1 block text-xs text-[#5D5A50] file:mr-3 file:rounded file:border file:border-[#D6CEBD] file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#B89450] hover:file:bg-[#FAF8F3]"
                    />
                    {itineraryDraft.image_signed_url && (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itineraryDraft.image_signed_url}
                          alt="Activity preview"
                          className="h-12 w-16 rounded border border-[#D6CEBD] object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setItineraryDraft((p) => ({
                              ...p,
                              image_url: "",
                              image_signed_url: "",
                            }))
                          }
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={itinerarySaving}
                      onClick={() => void saveItineraryItem()}
                      className="rounded bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-4 py-1.5 text-xs font-bold text-[#282722] hover:brightness-105 shadow-sm transition-all"
                    >
                      {itinerarySaving ? "Saving..." : editingItineraryId ? "Update Schedule Item" : "Save Schedule Item"}
                    </button>
                    {editingItineraryId !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItineraryId(null);
                          setItineraryDraft({
                            time: "",
                            activity_en: "",
                            activity_zh: "",
                            activity_th: "",
                            image_url: "",
                            image_signed_url: "",
                          });
                        }}
                        className="rounded border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs font-semibold text-[#5D5A50] hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Pricing */}
            {activeTab === "pricing" && (
              <div className="space-y-6 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                {/* PRICING MODEL SELECTOR */}
                <div className="rounded-xl border border-[#B89450]/30 bg-[#FAF8F3] p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-[#17352A] flex items-center gap-2">
                        <span>🏷</span>
                        <span>Select Rate & Pricing Model</span>
                      </h3>
                      <p className="text-[11px] text-[#5D5A50] mt-0.5">
                        Choose the specialized pricing design that fits this experience.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B89450] bg-white border border-[#D6CEBD] px-2.5 py-1 rounded-full">
                      Active: {pricingModel === "cooking_class" ? "Cooking Class" : pricingModel === "activity_atv" ? "Activities / ATV" : pricingModel === "transfer_timetable" ? "Transfer Timetable" : "Standard Tiers"}
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => setPricingModel("standard")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition cursor-pointer ${
                        pricingModel === "standard"
                          ? "border-[#B89450] bg-white shadow-xs ring-2 ring-[#B89450]/30"
                          : "border-[#D6CEBD] bg-white/70 hover:bg-white hover:border-[#B89450]/50"
                      }`}
                    >
                      <span className="text-xs font-bold text-[#17352A] flex items-center gap-1.5">
                        <span>🎟</span>
                        <span>Standard Tour / Tiers</span>
                      </span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        Base passenger rates & admission tiers (VIP, Regular, Buffet).
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingModel("cooking_class")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition cursor-pointer ${
                        pricingModel === "cooking_class"
                          ? "border-[#B89450] bg-white shadow-xs ring-2 ring-[#B89450]/30"
                          : "border-[#D6CEBD] bg-white/70 hover:bg-white hover:border-[#B89450]/50"
                      }`}
                    >
                      <span className="text-xs font-bold text-[#17352A] flex items-center gap-1.5">
                        <span>🍳</span>
                        <span>Cooking Class</span>
                      </span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        Join Program A/B (Cooking & Non-Cooking) + Half/Full Day Private Tiers.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingModel("activity_atv")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition cursor-pointer ${
                        pricingModel === "activity_atv"
                          ? "border-[#B89450] bg-white shadow-xs ring-2 ring-[#B89450]/30"
                          : "border-[#D6CEBD] bg-white/70 hover:bg-white hover:border-[#B89450]/50"
                      }`}
                    >
                      <span className="text-xs font-bold text-[#17352A] flex items-center gap-1.5">
                        <span>🏎</span>
                        <span>Activities & ATV</span>
                      </span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        Duration packages (30m, 1hr, 2hr), Driver vs Passenger rates & Slots.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingModel("transfer_timetable")}
                      className={`flex flex-col rounded-xl border p-3 text-left transition cursor-pointer ${
                        pricingModel === "transfer_timetable"
                          ? "border-[#B89450] bg-white shadow-xs ring-2 ring-[#B89450]/30"
                          : "border-[#D6CEBD] bg-white/70 hover:bg-white hover:border-[#B89450]/50"
                      }`}
                    >
                      <span className="text-xs font-bold text-[#17352A] flex items-center gap-1.5">
                        <span>🚤</span>
                        <span>Transfer Timetable</span>
                      </span>
                      <span className="text-[10px] text-gray-500 mt-1">
                        Speedboat pier routes, departures, arrival times & Adult/Child fares.
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-base font-bold text-[#282722]">
                    Base Tour Pricing
                  </h3>
                  <p className="text-xs text-[#5D5A50] mt-0.5">
                    Standard admission or baseline tour rates per passenger.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Adult Base Price (THB)
                    </label>
                    <input
                      type="number"
                      value={form.price ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, price: e.target.value as any }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Child Base Price (THB)
                    </label>
                    <input
                      type="number"
                      value={form.child_price ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, child_price: e.target.value as any }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Infant Price (THB)
                    </label>
                    <input
                      type="number"
                      placeholder="0 (Free)"
                      value={form.infant_price ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, infant_price: e.target.value as any }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>

                {/* DYNAMIC TICKET PRICING & RATES (TICKET TIERS) */}
                {pricingModel === "standard" && (
                <div className="border-t border-[#E5E0D8] pt-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
                    <div>
                      <h3 className="font-serif text-base font-bold text-[#282722] flex items-center gap-2">
                        <span>🎟</span>
                        <span>Dynamic Ticket Pricing & Rates (Ticket Tiers)</span>
                      </h3>
                      <p className="text-xs text-[#5D5A50] mt-0.5">
                        Add and configure multiple ticket admission tiers (e.g. Regular Seat, VIP Seat, Show + Buffet Dinner, Fast Pass).
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#17352A] bg-[#FAF8F3] border border-[#D6CEBD] px-2.5 py-1 rounded-full">
                      {ticketTypes.length} Active {ticketTypes.length === 1 ? "Tier" : "Tiers"}
                    </span>
                  </div>

                  {/* Active Ticket Tiers List */}
                  <div className="space-y-2.5">
                    {ticketTypes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#D6CEBD] bg-[#FAF8F3] p-4 text-center">
                        <p className="text-xs font-semibold text-gray-500">
                          No custom ticket tiers added yet (Standard Base Pricing applies).
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Use the quick presets below or fill out the form to add tiered admission options.
                        </p>
                      </div>
                    ) : (
                      ticketTypes.map((tier, idx) => {
                        const adultVal = tier.adult_price ?? tier.price;
                        const childVal = tier.child_price ?? adultVal;
                        return (
                          <div
                            key={tier.id || idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-3 text-xs shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#17352A] text-sm">
                                  {tier.name_en}
                                </span>
                                {tier.name_th && (
                                  <span className="text-gray-500 text-[11px]">({tier.name_th})</span>
                                )}
                                {tier.child_height_note && (
                                  <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                    📏 {tier.child_height_note}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-mono font-bold text-[#B89450]">
                                  Adult: THB {adultVal.toLocaleString()}
                                </span>
                                <span className="font-mono font-bold text-[#8C6D2D]">
                                  Child: THB {childVal.toLocaleString()}
                                </span>
                                {tier.description_en && (
                                  <span className="text-gray-500 text-[11px]">
                                    • {tier.description_en}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== idx))}
                              className="self-end sm:self-center text-red-500 hover:text-red-700 font-bold px-2 py-1 text-xs cursor-pointer"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Preset Ticket Quick Add Buttons */}
                  <div className="rounded-xl border border-dashed border-[#B89450]/40 bg-[#FFFDF9] p-3 space-y-2">
                    <p className="text-xs font-bold text-[#17352A]">Quick Preset Ticket Options:</p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TICKET_TYPES.map((preset, pIdx) => {
                        const adultPresetVal = preset.adult_price ?? preset.price ?? 0;
                        const childPresetVal = preset.child_price ?? adultPresetVal;
                        return (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setTicketTypes((prev) => [
                                ...prev,
                                {
                                  id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  name_en: preset.name_en,
                                  name_th: preset.name_th,
                                  name_zh: preset.name_zh,
                                  price: adultPresetVal,
                                  adult_price: adultPresetVal,
                                  child_price: childPresetVal,
                                  child_height_note: preset.child_height_note || "101–140 cm",
                                  description_en: preset.description_en,
                                },
                              ]);
                            }}
                            className="rounded-lg border border-[#B89450]/40 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#17352A] hover:bg-[#B89450] hover:text-white transition shadow-2xs cursor-pointer"
                          >
                            + {preset.name_en} (฿{adultPresetVal.toLocaleString()})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add New Custom Ticket Tier Form */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                    <h4 className="text-xs font-bold text-[#17352A]">+ Add Dynamic Ticket Tier</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                          Tier Name (English) *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Royal VIP Seat"
                          value={newTicketNameEn}
                          onChange={(e) => setNewTicketNameEn(e.target.value)}
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                          Tier Name (Thai)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ที่นั่งรอยัลวีไอพี"
                          value={newTicketNameTh}
                          onChange={(e) => setNewTicketNameTh(e.target.value)}
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                          Tier Name (Chinese)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 皇家贵宾席"
                          value={newTicketNameZh}
                          onChange={(e) => setNewTicketNameZh(e.target.value)}
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                          Adult Rate (THB) *
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 2500"
                          value={newTicketPrice}
                          onChange={(e) =>
                            setNewTicketPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                          Child Rate (THB)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 1800"
                          value={newTicketChildPrice}
                          onChange={(e) =>
                            setNewTicketChildPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                          Child Height Policy for Tier
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 101–140 cm (Free under 100 cm)"
                          value={newTicketChildHeightNote}
                          onChange={(e) => setNewTicketChildHeightNote(e.target.value)}
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-[#5D5A50]">
                        Tier Description & Inclusions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Includes front central theatre view and complimentary soft drink"
                        value={newTicketDescEn}
                        onChange={(e) => setNewTicketDescEn(e.target.value)}
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTicketNameEn.trim() || newTicketPrice === "") return;
                          const adultVal = Number(newTicketPrice);
                          const childVal = newTicketChildPrice === "" ? adultVal : Number(newTicketChildPrice);
                          setTicketTypes([
                            ...ticketTypes,
                            {
                              id: `ticket_${Date.now()}`,
                              name_en: newTicketNameEn.trim(),
                              name_th: newTicketNameTh.trim() || undefined,
                              name_zh: newTicketNameZh.trim() || undefined,
                              price: adultVal,
                              adult_price: adultVal,
                              child_price: childVal,
                              child_height_note: newTicketChildHeightNote.trim() || undefined,
                              description_en: newTicketDescEn.trim() || undefined,
                            },
                          ]);
                          setNewTicketNameEn("");
                          setNewTicketNameTh("");
                          setNewTicketNameZh("");
                          setNewTicketPrice("");
                          setNewTicketChildPrice("");
                          setNewTicketChildHeightNote("");
                          setNewTicketDescEn("");
                        }}
                        disabled={!newTicketNameEn.trim() || newTicketPrice === ""}
                        className="rounded-lg bg-[#B89450] px-4 py-2 text-xs font-bold text-white hover:bg-[#A38240] transition disabled:opacity-50 cursor-pointer"
                      >
                        + Add Ticket Tier
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {/* MODEL 2: COOKING CLASS PRICING (PICTURE 1: JOIN & PRIVATE TIERS) */}
                {pricingModel === "cooking_class" && (
                  <div className="border-t border-[#E5E0D8] pt-5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#282722] flex items-center gap-2">
                          <span>🍳</span>
                          <span>Cooking Class Rate Designer (Join & Private Classes)</span>
                        </h3>
                        <p className="text-xs text-[#5D5A50] mt-0.5">
                          Configure join class programs (Program A / B with cooking and non-cooking rates), private class group tiers, and extra dish rates matching Picture 1.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCookingClassDetails(DEFAULT_COOKING_CLASS)}
                        className="rounded-lg border border-[#B89450] bg-[#FAF8F3] px-3 py-1.5 text-xs font-bold text-[#B89450] hover:bg-[#B89450] hover:text-white transition cursor-pointer"
                      >
                        🔄 Reset to Cooking Class Sample Preset
                      </button>
                    </div>

                    {/* Section 1: Join Class Programs */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#17352A] uppercase tracking-wider">
                          1. Join Class Programs ({cookingClassDetails.programs?.length || 0} Programs)
                        </h4>
                        <span className="text-[11px] text-gray-500">
                          e.g. Program A (4 Menus, Market Tour), Program B (3 Menus)
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {cookingClassDetails.programs?.map((prog, pIdx) => (
                          <div
                            key={prog.id || pIdx}
                            className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-2 relative"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-serif text-sm font-bold text-[#17352A]">
                                  {prog.name}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="rounded bg-[#17352A] px-2 py-0.5 text-[10px] font-bold text-[#D1B16A]">
                                    {prog.menus_count} MENUS
                                  </span>
                                  {prog.includes_market_tour && (
                                    <span className="rounded bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                      ✓ Market Tour Included
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setCookingClassDetails((prev) => ({
                                    ...prev,
                                    programs: prev.programs.filter((_, i) => i !== pIdx),
                                  }))
                                }
                                className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E0D8]">
                              <div className="rounded-lg bg-white p-2 border border-[#E5E0D8]">
                                <span className="text-[10px] text-gray-500 block">Cooking Rate</span>
                                <span className="font-mono text-xs font-bold text-[#B89450]">
                                  THB {prog.cooking_price.toLocaleString()}
                                </span>
                              </div>
                              <div className="rounded-lg bg-white p-2 border border-[#E5E0D8]">
                                <span className="text-[10px] text-gray-500 block">Non-Cooking Person</span>
                                <span className="font-mono text-xs font-bold text-[#8C6D2D]">
                                  THB {prog.non_cooking_price.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {prog.notes && (
                              <p className="text-[10px] text-amber-800 italic">{prog.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Join Program Form */}
                      <div className="rounded-xl border border-dashed border-[#D6CEBD] bg-white p-4 space-y-3">
                        <p className="text-xs font-bold text-[#17352A]">+ Add Join Class Program</p>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Program Name *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Program C (Join)"
                              value={newCookProgName}
                              onChange={(e) => setNewCookProgName(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Menus Count
                            </label>
                            <input
                              type="number"
                              placeholder="4"
                              value={newCookProgMenus}
                              onChange={(e) => setNewCookProgMenus(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newCookProgMarketTour}
                                onChange={(e) => setNewCookProgMarketTour(e.target.checked)}
                                className="accent-[#B89450]"
                              />
                              <span>Market Tour Included</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Cooking Person Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="2800"
                              value={newCookProgPrice}
                              onChange={(e) => setNewCookProgPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Non-Cooking Person Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="1500"
                              value={newCookProgNonCookPrice}
                              onChange={(e) => setNewCookProgNonCookPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Note / Menu selection info
                            </label>
                            <input
                              type="text"
                              placeholder="Choose menu on the day..."
                              value={newCookProgNotes}
                              onChange={(e) => setNewCookProgNotes(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!newCookProgName.trim() || newCookProgPrice === ""}
                            onClick={() => {
                              if (!newCookProgName.trim() || newCookProgPrice === "") return;
                              setCookingClassDetails((prev) => ({
                                ...prev,
                                programs: [
                                  ...(prev.programs || []),
                                  {
                                    id: `cook_prog_${Date.now()}`,
                                    name: newCookProgName.trim(),
                                    menus_count: Number(newCookProgMenus || 4),
                                    includes_market_tour: Boolean(newCookProgMarketTour),
                                    cooking_price: Number(newCookProgPrice),
                                    non_cooking_price: Number(newCookProgNonCookPrice || Math.round(Number(newCookProgPrice) * 0.55)),
                                    notes: newCookProgNotes.trim() || undefined,
                                  },
                                ],
                              }));
                              setNewCookProgName("");
                              setNewCookProgPrice("");
                              setNewCookProgNonCookPrice("");
                              setNewCookProgNotes("");
                            }}
                            className="rounded-lg bg-[#B89450] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition disabled:opacity-50 cursor-pointer"
                          >
                            + Add Join Program
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Private Class Rates (Half Day & Full Day Tiers) */}
                    <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#17352A] uppercase tracking-wider">
                          2. Private Class Group Tiers ({cookingClassDetails.private_tiers?.length || 0} Tiers)
                        </h4>
                        <span className="text-[11px] text-gray-500">
                          Half Day (4 menus) & Full Day (7 menus) with 1-5, 6-8, 9-16 Pax flat rates
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-[#D6CEBD] bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#FAF8F3] text-[10px] font-bold text-[#5D5A50] uppercase border-b border-[#E5E0D8]">
                            <tr>
                              <th className="py-2.5 px-3">Class Type</th>
                              <th className="py-2.5 px-3">Menus</th>
                              <th className="py-2.5 px-3">Pax Tier</th>
                              <th className="py-2.5 px-3">Pax Range</th>
                              <th className="py-2.5 px-3">Flat Group Price (THB)</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E0D8]">
                            {cookingClassDetails.private_tiers?.map((tier, tIdx) => (
                              <tr key={tier.id || tIdx} className="hover:bg-[#FAF8F3]/50">
                                <td className="py-2 px-3 font-semibold text-[#17352A]">
                                  {tier.class_type}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                    {tier.menus_count} menus
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-bold text-gray-800">
                                  {tier.tier_label}
                                </td>
                                <td className="py-2 px-3 text-gray-600 font-mono text-[11px]">
                                  {tier.min_pax} - {tier.max_pax} Pax
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-[#B89450]">
                                  THB {tier.price.toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCookingClassDetails((prev) => ({
                                        ...prev,
                                        private_tiers: prev.private_tiers.filter((_, i) => i !== tIdx),
                                      }))
                                    }
                                    className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Private Tier Form */}
                      <div className="rounded-xl border border-dashed border-[#D6CEBD] bg-white p-4 space-y-3">
                        <p className="text-xs font-bold text-[#17352A]">+ Add Private Class Tier</p>
                        <div className="grid gap-3 sm:grid-cols-6">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Class Type
                            </label>
                            <select
                              value={newPrivClassType}
                              onChange={(e) => {
                                const val = e.target.value as "Half Day" | "Full Day";
                                setNewPrivClassType(val);
                                setNewPrivMenus(val === "Half Day" ? 4 : 7);
                              }}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            >
                              <option value="Half Day">Half Day</option>
                              <option value="Full Day">Full Day</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Menus Count
                            </label>
                            <input
                              type="number"
                              value={newPrivMenus}
                              onChange={(e) => setNewPrivMenus(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Tier Label *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 17-20 Pax"
                              value={newPrivTierLabel}
                              onChange={(e) => setNewPrivTierLabel(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Min Pax
                            </label>
                            <input
                              type="number"
                              value={newPrivMinPax}
                              onChange={(e) => setNewPrivMinPax(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Max Pax
                            </label>
                            <input
                              type="number"
                              value={newPrivMaxPax}
                              onChange={(e) => setNewPrivMaxPax(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="15000"
                              value={newPrivPrice}
                              onChange={(e) => setNewPrivPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!newPrivTierLabel.trim() || newPrivPrice === ""}
                            onClick={() => {
                              if (!newPrivTierLabel.trim() || newPrivPrice === "") return;
                              setCookingClassDetails((prev) => ({
                                ...prev,
                                private_tiers: [
                                  ...(prev.private_tiers || []),
                                  {
                                    id: `priv_tier_${Date.now()}`,
                                    class_type: newPrivClassType,
                                    menus_count: Number(newPrivMenus || 4),
                                    tier_label: newPrivTierLabel.trim(),
                                    min_pax: Number(newPrivMinPax || 1),
                                    max_pax: Number(newPrivMaxPax || 5),
                                    price: Number(newPrivPrice),
                                  },
                                ],
                              }));
                              setNewPrivTierLabel("");
                              setNewPrivPrice("");
                            }}
                            className="rounded-lg bg-[#B89450] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition disabled:opacity-50 cursor-pointer"
                          >
                            + Add Private Tier
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Extra Dish Add-on */}
                    <div className="border-t border-[#E5E0D8] pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#17352A]">
                            Extra Dish Rate (THB Per Dish)
                          </label>
                          <span className="text-[11px] text-gray-500">
                            Matching &quot;Extra Dish 1,000 THB Per Dish&quot; on rate card.
                          </span>
                        </div>
                        <div className="w-48">
                          <input
                            type="number"
                            placeholder="1000"
                            value={cookingClassDetails.extra_dish_price ?? 1000}
                            onChange={(e) =>
                              setCookingClassDetails((prev) => ({
                                ...prev,
                                extra_dish_price: e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] px-3 py-1.5 text-xs font-mono font-bold text-[#B89450] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODEL 3: ACTIVITIES & ATV PRICING (TICKET2ATTRACTION LINK STYLE) */}
                {pricingModel === "activity_atv" && (
                  <div className="border-t border-[#E5E0D8] pt-5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#282722] flex items-center gap-2">
                          <span>🏎</span>
                          <span>Activities & ATV Rate Designer (Duration, Driver/Passenger Rates)</span>
                        </h3>
                        <p className="text-xs text-[#5D5A50] mt-0.5">
                          Configure ATV options (30m, 1hr, 2hr, Zipline combo) with separate Driver and Passenger rates, plus daily session time slots.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivityPricing(DEFAULT_ACTIVITY_ATV)}
                        className="rounded-lg border border-[#B89450] bg-[#FAF8F3] px-3 py-1.5 text-xs font-bold text-[#B89450] hover:bg-[#B89450] hover:text-white transition cursor-pointer"
                      >
                        🔄 Reset to ATV Sample Preset
                      </button>
                    </div>

                    {/* Section 1: Package Options List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#17352A] uppercase tracking-wider">
                        1. Activity Packages ({activityPricing.packages?.length || 0} Options)
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {activityPricing.packages?.map((pkg, kIdx) => (
                          <div
                            key={pkg.id || kIdx}
                            className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-2 relative"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-serif text-sm font-bold text-[#17352A]">
                                  {pkg.name}
                                </h5>
                                {pkg.duration && (
                                  <span className="inline-block mt-1 rounded bg-[#17352A] px-2 py-0.5 text-[10px] font-bold text-[#D1B16A]">
                                    ⏱ {pkg.duration}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setActivityPricing((prev) => ({
                                    ...prev,
                                    packages: prev.packages.filter((_, i) => i !== kIdx),
                                  }))
                                }
                                className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E0D8]">
                              <div className="rounded-lg bg-white p-2 border border-[#E5E0D8]">
                                <span className="text-[10px] text-gray-500 block">Driver Rate</span>
                                <span className="font-mono text-xs font-bold text-[#B89450]">
                                  THB {pkg.driver_price.toLocaleString()}
                                </span>
                              </div>
                              <div className="rounded-lg bg-white p-2 border border-[#E5E0D8]">
                                <span className="text-[10px] text-gray-500 block">Passenger Rate</span>
                                <span className="font-mono text-xs font-bold text-[#8C6D2D]">
                                  THB {pkg.passenger_price.toLocaleString()}
                                </span>
                              </div>
                              <div className="rounded-lg bg-white p-2 border border-[#E5E0D8]">
                                <span className="text-[10px] text-gray-500 block">Child Rate</span>
                                <span className="font-mono text-xs font-bold text-gray-700">
                                  THB {(pkg.child_price ?? pkg.passenger_price).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {pkg.description && (
                              <p className="text-[11px] text-gray-600 mt-1">{pkg.description}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Activity Package Form */}
                      <div className="rounded-xl border border-dashed border-[#D6CEBD] bg-white p-4 space-y-3">
                        <p className="text-xs font-bold text-[#17352A]">+ Add Activity / ATV Package</p>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Package Name *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. ATV 1 Hour (Big Buddha Panoramic Experience)"
                              value={newAtvPkgName}
                              onChange={(e) => setNewAtvPkgName(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Duration
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 1 Hour"
                              value={newAtvDuration}
                              onChange={(e) => setNewAtvDuration(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Driver Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="1700"
                              value={newAtvDriverPrice}
                              onChange={(e) => setNewAtvDriverPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Passenger Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="1200"
                              value={newAtvPassengerPrice}
                              onChange={(e) => setNewAtvPassengerPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Child Price (THB)
                            </label>
                            <input
                              type="number"
                              placeholder="1200"
                              value={newAtvChildPrice}
                              onChange={(e) => setNewAtvChildPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                            Inclusions & Highlights Description
                          </label>
                          <input
                            type="text"
                            placeholder="Full 60-minute ride along jungle tracks with panoramic ocean views..."
                            value={newAtvDesc}
                            onChange={(e) => setNewAtvDesc(e.target.value)}
                            className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!newAtvPkgName.trim() || newAtvDriverPrice === ""}
                            onClick={() => {
                              if (!newAtvPkgName.trim() || newAtvDriverPrice === "") return;
                              setActivityPricing((prev) => ({
                                ...prev,
                                packages: [
                                  ...(prev.packages || []),
                                  {
                                    id: `atv_pkg_${Date.now()}`,
                                    name: newAtvPkgName.trim(),
                                    duration: newAtvDuration.trim() || undefined,
                                    driver_price: Number(newAtvDriverPrice),
                                    passenger_price: Number(newAtvPassengerPrice || Math.round(Number(newAtvDriverPrice) * 0.7)),
                                    child_price: newAtvChildPrice === "" ? undefined : Number(newAtvChildPrice),
                                    description: newAtvDesc.trim() || undefined,
                                  },
                                ],
                              }));
                              setNewAtvPkgName("");
                              setNewAtvDuration("");
                              setNewAtvDriverPrice("");
                              setNewAtvPassengerPrice("");
                              setNewAtvChildPrice("");
                              setNewAtvDesc("");
                            }}
                            className="rounded-lg bg-[#B89450] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition disabled:opacity-50 cursor-pointer"
                          >
                            + Add Activity Package
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Session Time Slots */}
                    <div className="border-t border-[#E5E0D8] pt-4 space-y-3">
                      <h4 className="text-xs font-bold text-[#17352A] uppercase tracking-wider">
                        2. Session Departure Time Slots
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Customer will select their preferred session time slot during booking.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {activityPricing.session_slots?.map((slot, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CEBD] bg-[#FAF8F3] px-3 py-1 text-xs font-mono font-bold text-[#17352A]"
                          >
                            <span>⏰ {slot}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setActivityPricing((prev) => ({
                                  ...prev,
                                  session_slots: prev.session_slots?.filter((_, i) => i !== sIdx),
                                }))
                              }
                              className="text-gray-400 hover:text-red-500 font-bold ml-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 max-w-sm pt-1">
                        <input
                          type="text"
                          placeholder="e.g. 14:30 or 16:30 (Sunset)"
                          value={newAtvSlot}
                          onChange={(e) => setNewAtvSlot(e.target.value)}
                          className="flex-1 rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={!newAtvSlot.trim()}
                          onClick={() => {
                            if (!newAtvSlot.trim()) return;
                            setActivityPricing((prev) => ({
                              ...prev,
                              session_slots: [...(prev.session_slots || []), newAtvSlot.trim()],
                            }));
                            setNewAtvSlot("");
                          }}
                          className="rounded-lg bg-[#282722] px-3 py-1.5 text-xs font-bold text-white hover:bg-black transition disabled:opacity-50 cursor-pointer"
                        >
                          + Add Slot
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODEL 4: TRANSFER TIMETABLE PRICING (PICTURE 2: BOAT TIMETABLE) */}
                {pricingModel === "transfer_timetable" && (
                  <div className="border-t border-[#E5E0D8] pt-5 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
                      <div>
                        <h3 className="font-serif text-base font-bold text-[#282722] flex items-center gap-2">
                          <span>🚤</span>
                          <span>Speedboat & Transfer Timetable Designer (Pier Schedules & Rates)</span>
                        </h3>
                        <p className="text-xs text-[#5D5A50] mt-0.5">
                          Configure boat timetable schedules (Phuket - Phi Phi, Laemtong Beach, Ao Po Marina, Krabi) with departure/arrival times and Adult/Child selling rates matching Picture 2.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTransferRoutes(DEFAULT_TRANSFER_ROUTES)}
                        className="rounded-lg border border-[#B89450] bg-[#FAF8F3] px-3 py-1.5 text-xs font-bold text-[#B89450] hover:bg-[#B89450] hover:text-white transition cursor-pointer"
                      >
                        🔄 Reset to Timetable Sample Preset
                      </button>
                    </div>

                    {/* Timetable Table */}
                    <div className="space-y-4">
                      {Array.from(new Set(transferRoutes.map((r) => r.schedule_route))).map((routeGroup) => {
                        const routesInGroup = transferRoutes.filter((r) => r.schedule_route === routeGroup);
                        return (
                          <div key={routeGroup} className="rounded-xl border border-[#D6CEBD] overflow-hidden bg-white shadow-2xs">
                            <div className="bg-[#17352A] px-4 py-2 flex items-center justify-between text-white">
                              <span className="font-serif text-xs font-bold text-[#D1B16A]">
                                Schedule: {routeGroup}
                              </span>
                              <span className="text-[10px] text-gray-300">
                                {routesInGroup.length} departures
                              </span>
                            </div>
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#FAF8F3] text-[10px] font-bold text-[#5D5A50] uppercase border-b border-[#E5E0D8]">
                                <tr>
                                  <th className="py-2 px-3">Departure Pier</th>
                                  <th className="py-2 px-3">Departure Time</th>
                                  <th className="py-2 px-3">Arrive Pier</th>
                                  <th className="py-2 px-3">Arrive Time</th>
                                  <th className="py-2 px-3">Adult Selling (THB)</th>
                                  <th className="py-2 px-3">Child Selling (THB)</th>
                                  <th className="py-2 px-3 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E0D8]">
                                {routesInGroup.map((item) => (
                                  <tr key={item.id} className="hover:bg-[#FAF8F3]/60">
                                    <td className="py-2 px-3 font-semibold text-[#17352A]">{item.departure_pier}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-[#B89450]">{item.departure_time} hrs</td>
                                    <td className="py-2 px-3 text-gray-700">{item.arrival_pier}</td>
                                    <td className="py-2 px-3 font-mono text-gray-600">{item.arrival_time} hrs</td>
                                    <td className="py-2 px-3 font-mono font-bold text-[#B89450]">THB {item.adult_price.toLocaleString()}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-[#8C6D2D]">THB {item.child_price.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => setTransferRoutes(transferRoutes.filter((r) => r.id !== item.id))}
                                        className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}

                      {/* Add Timetable Row Form */}
                      <div className="rounded-xl border border-dashed border-[#D6CEBD] bg-white p-4 space-y-3">
                        <p className="text-xs font-bold text-[#17352A]">+ Add Timetable Schedule Departure</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Schedule Route Name *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Phuket - Phi Phi Island"
                              value={newRouteSchedule}
                              onChange={(e) => setNewRouteSchedule(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Departure Pier *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Rassada Pier"
                              value={newRouteDeptPier}
                              onChange={(e) => setNewRouteDeptPier(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Arrival Pier *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Tonsai Pier"
                              value={newRouteArrPier}
                              onChange={(e) => setNewRouteArrPier(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Departure Time *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 09:30"
                              value={newRouteDeptTime}
                              onChange={(e) => setNewRouteDeptTime(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs font-mono text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Arrival Time *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 10:30"
                              value={newRouteArrTime}
                              onChange={(e) => setNewRouteArrTime(e.target.value)}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs font-mono text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Adult Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="1500"
                              value={newRouteAdultPrice}
                              onChange={(e) => setNewRouteAdultPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs font-mono text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                              Child Price (THB) *
                            </label>
                            <input
                              type="number"
                              placeholder="1300"
                              value={newRouteChildPrice}
                              onChange={(e) => setNewRouteChildPrice(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full rounded-lg border border-[#D6CEBD] px-2.5 py-1.5 text-xs font-mono text-[#282722] focus:border-[#B89450] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!newRouteDeptPier || !newRouteArrPier || !newRouteDeptTime || newRouteAdultPrice === ""}
                            onClick={() => {
                              if (!newRouteDeptPier || !newRouteArrPier || !newRouteDeptTime || newRouteAdultPrice === "") return;
                              setTransferRoutes([
                                ...transferRoutes,
                                {
                                  id: `route_${Date.now()}`,
                                  service_title: "Speedboat transfer service",
                                  schedule_route: newRouteSchedule.trim() || "Phuket - Phi Phi Island",
                                  departure_pier: newRouteDeptPier.trim(),
                                  arrival_pier: newRouteArrPier.trim(),
                                  departure_time: newRouteDeptTime.trim(),
                                  arrival_time: newRouteArrTime.trim() || newRouteDeptTime.trim(),
                                  adult_price: Number(newRouteAdultPrice),
                                  child_price: Number(newRouteChildPrice || newRouteAdultPrice),
                                  boat_type: newRouteBoatType || "Speedboat",
                                },
                              ]);
                              setNewRouteDeptTime("");
                              setNewRouteArrTime("");
                              setNewRouteAdultPrice("");
                              setNewRouteChildPrice("");
                            }}
                            className="rounded-lg bg-[#B89450] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition disabled:opacity-50 cursor-pointer"
                          >
                            + Add Timetable Row
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AGE & HEIGHT POLICIES (PASSENGER CATEGORIES & HEIGHT RULES) */}
                <div className="border-t border-[#E5E0D8] pt-5 space-y-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#282722] flex items-center gap-2">
                      <span>📏</span>
                      <span>Age & Height Policies (Child & Infant Rules)</span>
                    </h3>
                    <p className="text-xs text-[#5D5A50] mt-0.5">
                      Configure passenger categories, child height limits (e.g. 101–140 cm / 3&apos;3&quot;–4&apos;7&quot;), and infant free-entry boundaries.
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Child Age & Height Policy */}
                    <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                      <p className="text-xs font-bold text-[#B89450] flex items-center gap-1.5">
                        <span>🧒</span>
                        <span>Child Passenger Policy</span>
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Min Age (Years)
                          </label>
                          <input
                            type="number"
                            placeholder="4"
                            value={form.child_age_min ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, child_age_min: e.target.value as any }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Max Age (Years)
                          </label>
                          <input
                            type="number"
                            placeholder="11"
                            value={form.child_age_max ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, child_age_max: e.target.value as any }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Child Height Range (cm) */}
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#E5E0D8]">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Min Height (cm)
                          </label>
                          <input
                            type="number"
                            placeholder="101"
                            value={childHeightMin}
                            onChange={(e) =>
                              setChildHeightMin(e.target.value === "" ? "" : Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400 mt-0.5 block">e.g. 101 cm (3&apos;3&quot;)</span>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Max Height (cm)
                          </label>
                          <input
                            type="number"
                            placeholder="140"
                            value={childHeightMax}
                            onChange={(e) =>
                              setChildHeightMax(e.target.value === "" ? "" : Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                          <span className="text-[10px] text-gray-400 mt-0.5 block">e.g. 140 cm (4&apos;7&quot;)</span>
                        </div>
                      </div>
                    </div>

                    {/* Infant Age & Height Policy */}
                    <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-3">
                      <p className="text-xs font-bold text-[#B89450] flex items-center gap-1.5">
                        <span>👶</span>
                        <span>Infant Passenger Policy</span>
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Min Age (Years)
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={form.infant_age_min ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, infant_age_min: e.target.value as any }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Max Age (Years)
                          </label>
                          <input
                            type="number"
                            placeholder="2"
                            value={form.infant_age_max ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, infant_age_max: e.target.value as any }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Infant Free Under Height */}
                      <div className="pt-1 border-t border-[#E5E0D8]">
                        <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                          Free Entry Under Height (cm)
                        </label>
                        <input
                          type="number"
                          placeholder="100"
                          value={infantHeightMax}
                          onChange={(e) =>
                            setInfantHeightMax(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          Children under 100 cm (3&apos;3&quot;) enter free of charge without a separate seat.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Child Height Policy Note matching screenshot */}
                  <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4">
                    <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                      Child Height & Age Policy Notice (Displayed to Customers)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Child height between 101–140 cm (3'3&quot;–4'7&quot;). Children under 100 cm enter free of charge without a separate seat. Guests over 140 cm will be charged at adult rate."
                      value={childHeightNote}
                      onChange={(e) => setChildHeightNote(e.target.value)}
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Images & Gallery */}
            {activeTab === "images" && (
              <div className="space-y-6 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D8] pb-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#282722]">
                      Media & Photo Gallery (Multiple Pictures)
                    </h3>
                    <p className="text-xs text-[#736E62]">
                      Upload multiple high-resolution photos for this tour. Visitors can browse through the interactive photo gallery on the tour detail page.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={galleryImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleGalleryImageUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingGalleryImage}
                      onClick={() => galleryImageInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#282722] px-3 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="h-4 w-4 text-[#B89450]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {isUploadingGalleryImage ? "Uploading..." : "Upload New Photo"}
                    </button>
                  </div>
                </div>

                {/* Primary Cover Image Preview & Selector */}
                <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-[#B89450] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Primary Cover Photo
                        </span>
                        <span className="text-xs text-[#5D5A50]">
                          Displayed on tour cards, search results, and hero banner.
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={form.image_url ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, image_url: e.target.value }))
                          }
                          placeholder="Primary image URL (e.g. /tours/phi-phi.jpg or https://...)"
                          className="w-full sm:w-96 rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                        />
                      </div>
                    </div>
                    {form.image_url && (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.image_url}
                          alt="Cover preview"
                          className="h-20 w-32 rounded-lg border border-[#B89450] object-cover shadow-xs"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">
                          Cover
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Photo by URL */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#282722]">
                    Add Picture to Gallery (By URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddGalleryUrl();
                        }
                      }}
                      placeholder="Enter image URL (e.g. https://... or /tours/island2.jpg)"
                      className="flex-1 rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:ring-1 focus:ring-[#B89450] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddGalleryUrl}
                      className="rounded-lg bg-[#B89450] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#9E7D3B] cursor-pointer"
                    >
                      + Add to Gallery
                    </button>
                  </div>
                </div>

                {/* Gallery Images Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#736E62]">
                      Tour Gallery ({galleryImages.length} {galleryImages.length === 1 ? "Photo" : "Photos"})
                    </h4>
                    {galleryImages.length === 0 && (
                      <span className="text-[11px] text-amber-700">
                        No gallery photos added yet. Upload files or enter image URLs above.
                      </span>
                    )}
                  </div>

                  {galleryImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {galleryImages.map((imgUrl, idx) => {
                        const isCover = form.image_url === imgUrl;
                        return (
                          <div
                            key={idx}
                            className={`group relative overflow-hidden rounded-xl border-2 transition ${
                              isCover ? "border-[#B89450] shadow-md" : "border-[#E5E0D8] hover:border-[#D6CEBD]"
                            } bg-[#FAF8F3]`}
                          >
                            <div className="aspect-4/3 w-full overflow-hidden bg-black/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={`Gallery image ${idx + 1}`}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>

                            {/* Badge */}
                            {isCover ? (
                              <div className="absolute top-2 left-2 rounded-md bg-[#B89450] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                ★ Cover Photo
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetAsCover(imgUrl)}
                                className="absolute top-2 left-2 hidden rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#282722] shadow-xs hover:bg-white group-hover:inline-block cursor-pointer"
                              >
                                Set as Cover
                              </button>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between border-t border-[#E5E0D8] bg-white p-2">
                              <span className="text-[10px] text-[#736E62]">
                                #{idx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                {!isCover && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetAsCover(imgUrl)}
                                    title="Make this the primary cover photo"
                                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#B89450] hover:bg-[#FAF8F3] cursor-pointer"
                                  >
                                    Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGalleryImage(idx)}
                                  title="Delete from gallery"
                                  className="rounded p-1 text-red-500 hover:bg-red-50 cursor-pointer"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D6CEBD] bg-[#FAF8F3] py-10 text-center">
                      <svg className="h-10 w-10 text-[#B89450]/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-semibold text-[#282722]">
                        No gallery photos yet
                      </p>
                      <p className="text-[11px] text-[#736E62] max-w-sm mt-0.5">
                        Add multiple photos so customers can view pictures of the boat, destinations, activities, and dining options.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: SEO & Settings */}
            {activeTab === "seo" && (
              <div className="space-y-6 rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-xs">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#282722]">
                    Tour Source, Partner Company &amp; Internal Settings
                  </h3>
                  <p className="text-xs text-[#5D5A50] mt-0.5">
                    Configure operator sources and partner supplier details. <strong className="text-[#17352A]">All partner company information is strictly internal and hidden from customers on the front end.</strong>
                  </p>
                </div>

                <div className="rounded-xl border border-[#D6CEBD] bg-[#FAF8F3] p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#17352A]">Tour Operator Source</h4>
                      <p className="text-[11px] text-[#5D5A50]">
                        Select whether this tour is directly operated by Silver Hawk or supplied by an external partner company.
                      </p>
                    </div>
                    <select
                      value={form.tour_source}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tour_source: e.target.value as "company" | "partner",
                        }))
                      }
                      className="rounded-lg border border-[#D6CEBD] bg-white px-3 py-1.5 text-xs font-semibold text-[#282722] focus:border-[#B89450] focus:outline-none"
                    >
                      <option value="company">Company Tour (Silver Hawk Group)</option>
                      <option value="partner">Partner Company Tour (External Supplier)</option>
                    </select>
                  </div>

                  {form.tour_source === "partner" && (
                    <div className="space-y-4 pt-1">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-[#5D5A50]">
                              Partner Company *
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPartnerModalTab("manage");
                                  setIsAddingPartnerModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-gray-600 hover:text-[#17352A] underline cursor-pointer"
                              >
                                ⚙️ Manage / Delete Partners
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPartnerModalTab("add");
                                  setIsAddingPartnerModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-[#B89450] hover:underline cursor-pointer"
                              >
                                + Add New
                              </button>
                            </div>
                          </div>
                          <select
                            value={form.partner_company ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setPartnerModalTab("add");
                                setIsAddingPartnerModalOpen(true);
                              } else if (val === "__manage__") {
                                setPartnerModalTab("manage");
                                setIsAddingPartnerModalOpen(true);
                              } else {
                                setForm((prev) => ({ ...prev, partner_company: val }));
                                const matched = partnerCompanyList.find((p) => p.name === val);
                                if (matched) {
                                  setPartnerDetails((prev) => ({
                                    ...prev,
                                    contact_name: prev.contact_name || matched.contact_person,
                                    contact_phone: prev.contact_phone || matched.contact_phone,
                                    contact_email: prev.contact_email || matched.contact_email,
                                    notes: prev.notes || matched.notes,
                                  }));
                                }
                              }
                            }}
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          >
                            <option value="">Select a partner company...</option>
                            {partnerCompanies.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                            <option value="__new__">+ Add New Partner Company...</option>
                            <option value="__manage__">⚙️ Manage &amp; Delete Partner Companies...</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Partner Tour Code / Product ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. CM-SHOW-01 or FN-VIP-02"
                            value={partnerDetails.partner_tour_code ?? ""}
                            onChange={(e) =>
                              setPartnerDetails((p) => ({ ...p, partner_tour_code: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Contact Person / Desk
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Reservation Team"
                            value={partnerDetails.contact_name ?? ""}
                            onChange={(e) =>
                              setPartnerDetails((p) => ({ ...p, contact_name: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Contact Email
                          </label>
                          <input
                            type="email"
                            placeholder="booking@partner.com"
                            value={partnerDetails.contact_email ?? ""}
                            onChange={(e) =>
                              setPartnerDetails((p) => ({ ...p, contact_email: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Contact Phone / WhatsApp
                          </label>
                          <input
                            type="text"
                            placeholder="+66 76 123 456"
                            value={partnerDetails.contact_phone ?? ""}
                            onChange={(e) =>
                              setPartnerDetails((p) => ({ ...p, contact_phone: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Commission Rate / Margin (%)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 15% or Net 1,200 THB"
                            value={partnerDetails.commission_rate ?? ""}
                            onChange={(e) =>
                              setPartnerDetails((p) => ({ ...p, commission_rate: e.target.value }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                            Booking Lead Time (Hours before departure/show)
                          </label>
                          <input
                            type="number"
                            placeholder="2"
                            value={partnerDetails.lead_time_hours ?? ""}
                            onChange={(e) =>
                              setPartnerDetails((p) => ({
                                ...p,
                                lead_time_hours:
                                  e.target.value === "" ? undefined : Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#5D5A50]">
                          Partner Notes / Voucher Instructions (Internal)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Special voucher redemption procedure, contact desk number, or settlement instructions..."
                          value={partnerDetails.notes ?? ""}
                          onChange={(e) =>
                            setPartnerDetails((p) => ({ ...p, notes: e.target.value }))
                          }
                          className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add / Edit Pick-up Location */}
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-2xl text-[#282722]">
              <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
                <h3 className="font-serif text-base font-bold text-[#282722]">
                  {editingLocationIndex !== null
                    ? "Edit Pick-up Location"
                    : "Add Pick-up Location"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="text-gray-400 hover:text-[#282722] p-1"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                    Pick-up Location Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ao Nang, Krabi Town"
                    value={locationForm.location_name}
                    onChange={(e) =>
                      setLocationForm((p) => ({ ...p, location_name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                      Adult Price (THB)
                    </label>
                    <input
                      type="number"
                      value={locationForm.adult_price}
                      onChange={(e) =>
                        setLocationForm((p) => ({
                          ...p,
                          adult_price: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                      Child Price (THB)
                    </label>
                    <input
                      type="number"
                      value={locationForm.child_price}
                      onChange={(e) =>
                        setLocationForm((p) => ({
                          ...p,
                          child_price: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lobby pickup or Pier"
                    value={locationForm.notes}
                    onChange={(e) =>
                      setLocationForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-[#5D5A50]">Active Status</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLocationForm((p) => ({ ...p, is_active: !p.is_active }))
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      locationForm.is_active ? "bg-[#B89450]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                        locationForm.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#E5E0D8] pt-4">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="rounded-lg border border-[#D6CEBD] bg-white px-4 py-2 text-xs font-semibold text-[#5D5A50] hover:bg-[#FAF8F3] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveLocationModal}
                  className="rounded-lg bg-gradient-to-r from-[#D1B16A] to-[#B89450] px-5 py-2 text-xs font-bold text-[#282722] shadow-md hover:brightness-105 transition-all"
                >
                  Save Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add & Manage Partner Companies */}
        {isAddingPartnerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[#D6CEBD] bg-white p-6 shadow-2xl text-[#282722] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3 mb-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#282722]">
                    Partner Company Management
                  </h3>
                  <p className="text-[11px] text-[#5D5A50]">
                    Manage suppliers, add contact details, or remove partner companies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingPartnerModalOpen(false)}
                  className="text-gray-400 hover:text-[#282722] p-1 cursor-pointer text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#E5E0D8] mb-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPartnerModalTab("add")}
                  className={`pb-2 px-3 text-xs font-bold transition border-b-2 ${
                    partnerModalTab === "add"
                      ? "border-[#B89450] text-[#17352A]"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  + Add New Partner
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerModalTab("manage")}
                  className={`pb-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                    partnerModalTab === "manage"
                      ? "border-[#B89450] text-[#17352A]"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <span>📋 Existing Partners</span>
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono">
                    {partnerCompanies.length}
                  </span>
                </button>
              </div>

              {partnerModalTab === "add" ? (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Phuket Elephant Sanctuary"
                      value={newPartnerName}
                      onChange={(e) => setNewPartnerName(e.target.value)}
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                        Contact Person / Desk
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Reservation Team"
                        value={newPartnerContactPerson}
                        onChange={(e) => setNewPartnerContactPerson(e.target.value)}
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                        Contact Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +66 76 123 456"
                        value={newPartnerContactPhone}
                        onChange={(e) => setNewPartnerContactPhone(e.target.value)}
                        className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. booking@partner.com"
                      value={newPartnerContactEmail}
                      onChange={(e) => setNewPartnerContactEmail(e.target.value)}
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5D5A50]">
                      Internal Notes / Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Redemption instructions, account settlement notes..."
                      value={newPartnerNotes}
                      onChange={(e) => setNewPartnerNotes(e.target.value)}
                      className="w-full rounded-lg border border-[#D6CEBD] bg-white px-3 py-2 text-xs text-[#282722] focus:border-[#B89450] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setIsAddingPartnerModalOpen(false)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPartnerCompany}
                      disabled={!newPartnerName.trim()}
                      className="rounded-lg bg-[#B89450] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#A38240] transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      Save Partner Company
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-96">
                  {partnerCompanies.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500">
                      No partner companies registered yet.
                    </div>
                  ) : (
                    partnerCompanies.map((name) => {
                      const item = partnerCompanyList.find(
                        (p) => p.name.toLowerCase() === name.toLowerCase()
                      );
                      const targetId = item?.id || name;
                      return (
                        <div
                          key={targetId}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#FAF8F3] transition"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-xs font-bold text-[#17352A] block truncate">
                              {name}
                            </span>
                            {(item?.contact_person || item?.contact_phone || item?.contact_email) && (
                              <div className="text-[11px] text-gray-500 space-y-0.5">
                                {item.contact_person && <div>Person: {item.contact_person}</div>}
                                {item.contact_phone && <div>Phone: {item.contact_phone}</div>}
                                {item.contact_email && <div>Email: {item.contact_email}</div>}
                              </div>
                            )}
                            {item?.notes && (
                              <p className="text-[10px] text-gray-400 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePartnerCompany(targetId)}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-400 transition cursor-pointer shrink-0"
                            title="Delete this partner company"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      );
                    })
                  )}

                  <div className="flex justify-end pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setIsAddingPartnerModalOpen(false)}
                      className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        </main>
    </div>
  );
}
