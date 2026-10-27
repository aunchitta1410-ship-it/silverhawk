import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export * from "./tour-extended-types";
export * from "./tour-code";
import { generateTourId } from "./tour-code";
import {
  type TourType,
  type TourExtendedData,
  DEFAULT_NOT_RECOMMENDED_LOCALIZED,
  DEFAULT_INCLUDES_LOCALIZED,
  DEFAULT_EXCLUDES_LOCALIZED,
  DEFAULT_WHAT_TO_BRING_LOCALIZED,
  normalizeRuleItem,
} from "./tour-extended-types";

async function readStore(): Promise<Record<string, TourExtendedData>> {
  try {
    return await readJsonStorage<Record<string, TourExtendedData>>(
      "tour_extended.json",
      {},
      "tour_extended"
    );
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, TourExtendedData>): Promise<void> {
  try {
    await writeJsonStorage("tour_extended.json", data, "tour_extended");
  } catch (err) {
    console.error("Failed to write tour extended store:", err);
  }
}

export async function getAllTourExtendedData(): Promise<Record<string, TourExtendedData>> {
  return await readStore();
}

export function getDefaultTourExtended(tourId: number, baseTourType?: string): TourExtendedData {
  let mappedType: TourType = "Tour Package";
  const rawType = (baseTourType || "").toLowerCase();

  if (rawType.includes("ticket")) mappedType = "Ticket Only";
  else if (rawType.includes("transfer")) mappedType = "Transfer Only";
  else if (rawType.includes("private")) mappedType = "Private Tour";
  else if (rawType.includes("activity") || rawType.includes("atv") || rawType.includes("snorkeling"))
    mappedType = "Activity Only";

  if (mappedType === "Ticket Only") {
    return {
      tourId,
      custom_tour_id: generateTourId("Tickets & Attractions", "Theme & Water Parks", tourId),
      tour_order: tourId,
      tour_type: "Ticket Only",
      category: "Tickets & Attractions",
      subcategory: "Theme & Water Parks",
      charges_extra_pickup_fee: false,
      not_recommended: [],
      tour_includes: [
        {
          id: "inc_t1",
          en: "Official direct admission e-ticket / wristband",
          th: "บัตรเข้าชมอิเล็กทรอนิกส์ / สายรัดข้อมือเข้างานอย่างเป็นทางการ",
          zh: "官方直接入园电子门票 / 入场手环",
        },
        {
          id: "inc_t2",
          en: "Access to all open attractions, rides, and zones",
          th: "เข้าถึงเครื่องเล่น โซน และการแสดงมาตรฐานทั้งหมด",
          zh: "畅玩所有标准游乐设施、表演及园区",
        },
        {
          id: "inc_t3",
          en: "All government taxes and attraction service fees",
          th: "รวมภาษีรัฐบาลและค่าธรรมเนียมบริการทั้งหมด",
          zh: "包含所有政府税费及景点服务费",
        },
      ],
      tour_excludes: [
        {
          id: "exc_t1",
          en: "Hotel roundtrip transfer (Self-transportation to venue)",
          th: "รถรับส่งโรงแรม (เดินทางไปยังสถานที่ด้วยตนเอง)",
          zh: "往返酒店接送（需自行前往景点）",
        },
        {
          id: "exc_t2",
          en: "Food, drinks, and personal expenses inside the venue",
          th: "อาหาร เครื่องดื่ม และค่าใช้จ่ายส่วนตัวภายในงาน",
          zh: "园内餐饮、软饮及个人消费",
        },
      ],
      what_to_bring: [
        {
          id: "wtb_t1",
          en: "Valid photo ID or digital passport photo on mobile",
          th: "บัตรประชาชนหรือรูปถ่ายพาสปอร์ตในโทรศัพท์มือถือ",
          zh: "有效身份证件或手机内护照清晰照片",
        },
        {
          id: "wtb_t2",
          en: "Silver Hawk digital booking voucher with QR/barcode",
          th: "เวาเชอร์ยืนยันการจองของ Silver Hawk พร้อมคิวอาร์โค้ด",
          zh: "Silver Hawk 电子确认凭证（含二维码/条形码）",
        },
      ],
      gallery_images: [],
      custom_fields: [
        {
          id: "cf_format",
          name_en: "Ticket Format",
          name_th: "รูปแบบบัตร",
          name_zh: "门票形式",
          value_en: "Instant Mobile E-Ticket (QR Code scan at gate)",
          value_th: "บัตรอิเล็กทรอนิกส์ในมือถือ (สแกนคิวอาร์โค้ดที่ประตูทางเข้า)",
          value_zh: "手机电子门票（闸机直接扫码入园）",
        },
        {
          id: "cf_entry",
          name_en: "Admission Method",
          name_th: "วิธีเข้าชม",
          name_zh: "入园方式",
          value_en: "Direct Turnstile / Gate Scan",
          value_th: "สแกนที่ประตูหมุน / ทางเข้าโดยตรง",
          value_zh: "直通闸机 / 快速通关入园",
        },
      ],
      ticket_types: [
        {
          id: "tt_std",
          name_en: "Standard Admission Ticket",
          name_th: "บัตรเข้าชมมาตรฐาน",
          name_zh: "标准入园门票",
          price: 0,
          description_en: "Full general admission during regular opening hours",
          description_th: "เข้าชมทั่วไปตลอดเวลาทำการปกติ",
          description_zh: "常规营业时间内全天通用通行",
        },
        {
          id: "tt_vip",
          name_en: "VIP / Royal Seat Pass",
          name_th: "บัตรที่นั่งวีไอพี / รอยัลซีต",
          name_zh: "VIP贵宾席 / 皇家特等座",
          price: 500,
          description_en: "Prime central stage view with complimentary lounge access",
          description_th: "จุดชมวิวเวทีกึ่งกลางที่ดีที่สุดพร้อมเข้าใช้เลานจ์พิเศษ",
          description_zh: "剧场正中最佳观演席位，享贵宾休息室礼遇",
        },
      ],
      optional_addons: [],
      custom_booking_fields: [],
      ticket_details: {
        venue_address: "Attraction Ticket Counter, Phuket",
        redemption_point: "Digital scan at Gate Turnstile or Ticket Redemption Booth",
        validity_notes: "Valid for selected travel date only during operating hours",
        admission_hours: "10:00 - 18:00 (Daily)",
        show_times: ["17:30", "19:30", "20:30"],
        daily_shows_count: 3,
        has_transfer_addon: true,
        transfer_price: 350,
      },
    };
  }

  return {
    tourId,
    custom_tour_id: generateTourId("Island & Marine", "One Day Trip", tourId),
    tour_order: tourId,
    tour_type: mappedType,
    category: "Island & Marine",
    subcategory: "One Day Trip",
    charges_extra_pickup_fee: false, // Default: everything every price is included in the tour!
    not_recommended: [...DEFAULT_NOT_RECOMMENDED_LOCALIZED],
    tour_includes: [...DEFAULT_INCLUDES_LOCALIZED],
    tour_excludes: [...DEFAULT_EXCLUDES_LOCALIZED],
    what_to_bring: [...DEFAULT_WHAT_TO_BRING_LOCALIZED],
    gallery_images: [],
    custom_fields: [
      {
        id: "cf_guide",
        name_en: "Tour Guide Language",
        name_th: "ภาษาของไกด์นำเที่ยว",
        name_zh: "导游语言",
        value_en: "English & Chinese (Professional Licensed)",
        value_th: "อังกฤษและจีน (มีใบอนุญาตวิชาชีพ)",
        value_zh: "中文与英文（专业持证导游）",
      },
      {
        id: "cf_departure",
        name_en: "Departure Pier",
        name_th: "ท่าเรือต้นทาง",
        name_zh: "出发码头",
        value_en: "Royal Phuket Marina (Pier 4)",
        value_th: "รอยัล ภูเก็ต มารีน่า (ท่าเทียบเรือ 4)",
        value_zh: "普吉皇家游艇码头（4号码头）",
      },
    ],
    ticket_types: [],
    optional_addons: [
      {
        id: "addon_snorkel",
        name_en: "Full-Face Snorkel Mask Rental",
        name_th: "เช่าหน้ากากดำน้ำแบบเต็มหน้า",
        name_zh: "全干式面罩呼吸管租赁",
        price: 250,
        price_type: "per_person",
        description_en: "180° panoramic view with anti-fog technology",
        description_th: "มุมมอง 180 องศา พร้อมเทคโนโลยีป้องกันฝ้า",
        description_zh: "180度全景视野，专业防雾防水",
      },
      {
        id: "addon_lunch",
        name_en: "Seafood & Lobster Buffet Upgrade",
        name_th: "อัปเกรดบุฟเฟต์ซีฟู้ดและกุ้งมังกร",
        name_zh: "升级海鲜与龙虾自助盛宴",
        price: 590,
        price_type: "per_person",
        description_en: "Premium fresh grilled seafood feast on the private beach",
        description_th: "อิ่มอร่อยกับซีฟู้ดย่างสดใหม่ริมชายหาดส่วนตัว",
        description_zh: "在私人海滩享用现烤新鲜海鲜大餐",
      },
    ],
    custom_booking_fields: [
      {
        id: "cbf_diet",
        label_en: "Dietary Preferences / Food Allergies",
        label_th: "ความต้องการด้านอาหาร / การแพ้อาหาร",
        label_zh: "饮食偏好 / 食物过敏",
        field_type: "text",
        required: false,
        placeholder_en: "e.g., Vegetarian, Halal, No Seafood, Nut Allergy",
      },
      {
        id: "cbf_emergency",
        label_en: "Emergency Contact Name & Phone",
        label_th: "ชื่อและเบอร์โทรติดต่อฉุกเฉิน",
        label_zh: "紧急联系人姓名与电话",
        field_type: "text",
        required: false,
        placeholder_en: "e.g., +66 81 234 5678 (WhatsApp / Line)",
      },
    ],
    ticket_details: {
      venue_address: "Attraction Ticket Counter, Phuket",
      redemption_point: "Present digital e-voucher at Ticket Gate",
      validity_notes: "Valid only on selected date during operating hours",
      admission_hours: "09:00 - 18:00 (Daily)",
      show_times: ["17:30", "19:30", "20:30"],
      daily_shows_count: 3,
      has_transfer_addon: true,
      transfer_price: 350,
      unit: "per ticket",
      custom_details: [
        {
          id: "td_venue",
          name_en: "Attraction Venue",
          name_th: "สถานที่จัดแสดง / ทางเข้า",
          name_zh: "景点与场馆地址",
          value_en: "Attraction Ticket Counter, Phuket",
        },
        {
          id: "td_redemption",
          name_en: "Ticket Redemption Point",
          name_th: "จุดแลกรับบัตร",
          name_zh: "换票与入园处",
          value_en: "Present digital e-voucher at Ticket Gate",
        },
        {
          id: "td_hours",
          name_en: "Admission Operating Hours",
          name_th: "เวลาทำการเปิดให้เข้าชม",
          name_zh: "开园及营业时间",
          value_en: "09:00 - 18:00 (Daily)",
        },
        {
          id: "td_validity",
          name_en: "Ticket Validity",
          name_th: "อายุการใช้งานบัตร",
          name_zh: "门票有效期",
          value_en: "Valid only on selected date during operating hours",
        },
      ],
    },
    transfer_details: {
      service_type: "Airport Transfer",
      vehicle_types: ["VIP Toyota Commuter Van (1-10 pax)", "Executive Sedan (1-3 pax)", "Luxury SUV (1-4 pax)"],
      pickup_zones: ["Phuket Airport (HKT)", "Phuket Town", "Patong", "Kata/Karon", "Rawai/Nai Harn", "Bang Tao/Laguna"],
      dropoff_zones: ["Hotel Lobby", "Phuket Airport (HKT)", "Rassada Pier", "Ao Po Grand Marina"],
      luggage_policy: "1 standard suitcase + 1 carry-on bag per passenger",
    },
    activity_details: {
      activity_name: "Signature Island Activity",
      session_slots: ["Morning 09:00 - 11:30", "Afternoon 13:30 - 16:00"],
      duration: "2 Hours",
      equipment_provided: ["Full safety gear", "Instructor guidance", "Complimentary locker"],
      safety_requirements: "Minimum age 10 years old. Good physical condition required.",
    },
    private_details: {
      charter_type: "Private Speedboat",
      max_capacity: 15,
      charter_duration: "Full Day (8 Hours)",
      customizable_itinerary: true,
    },
  };
}

export async function getTourExtendedData(
  tourId: number,
  baseTourType?: string
): Promise<TourExtendedData> {
  const store = await readStore();
  const def = getDefaultTourExtended(tourId, baseTourType);
  const cached = store[String(tourId)];

  if (cached) {
    if (!cached.custom_fields) cached.custom_fields = [...def.custom_fields!];
    if (!cached.ticket_types) cached.ticket_types = [];
    if (!cached.optional_addons) cached.optional_addons = [...def.optional_addons!];
    if (!cached.custom_booking_fields) cached.custom_booking_fields = [...def.custom_booking_fields!];
    if (!cached.not_recommended || cached.not_recommended.length === 0) {
      cached.not_recommended = [...def.not_recommended];
    } else {
      cached.not_recommended = cached.not_recommended.map(normalizeRuleItem);
    }
    if (!cached.tour_includes || cached.tour_includes.length === 0) {
      cached.tour_includes = [...def.tour_includes];
    } else {
      cached.tour_includes = cached.tour_includes.map(normalizeRuleItem);
    }
    if (!cached.tour_excludes || cached.tour_excludes.length === 0) {
      cached.tour_excludes = [...def.tour_excludes];
    } else {
      cached.tour_excludes = cached.tour_excludes.map(normalizeRuleItem);
    }
    if (!cached.what_to_bring || cached.what_to_bring.length === 0) {
      cached.what_to_bring = [...def.what_to_bring];
    } else {
      cached.what_to_bring = cached.what_to_bring.map(normalizeRuleItem);
    }
    return cached;
  }

  // Generate sensible defaults
  store[String(tourId)] = def;
  await writeStore(store);
  return def;
}

export async function saveTourExtendedData(
  tourId: number,
  updates: Partial<TourExtendedData>
): Promise<TourExtendedData> {
  const store = await readStore();
  const existing = store[String(tourId)] || getDefaultTourExtended(tourId, updates.tour_type);

  const updated: TourExtendedData = {
    ...existing,
    ...updates,
    tourId,
    tour_order: updates.tour_order ?? existing.tour_order,
    custom_tour_id:
      updates.custom_tour_id?.trim() ||
      generateTourId(
        updates.category || existing.category,
        updates.subcategory || existing.subcategory,
        updates.tour_order ?? existing.tour_order ?? tourId
      ),
    not_recommended: updates.not_recommended
      ? updates.not_recommended.map(normalizeRuleItem)
      : existing.not_recommended.map(normalizeRuleItem),
    tour_includes: updates.tour_includes
      ? updates.tour_includes.map(normalizeRuleItem)
      : existing.tour_includes.map(normalizeRuleItem),
    tour_excludes: updates.tour_excludes
      ? updates.tour_excludes.map(normalizeRuleItem)
      : existing.tour_excludes.map(normalizeRuleItem),
    what_to_bring: updates.what_to_bring
      ? updates.what_to_bring.map(normalizeRuleItem)
      : existing.what_to_bring.map(normalizeRuleItem),
  };

  store[String(tourId)] = updated;
  await writeStore(store);

  // Attempt to sync to Supabase tours table if columns exist
  try {
    const adminClient = createAdminClient();
    await adminClient
      .from("tours")
      .update({
        tour_type: updated.tour_type,
        category: updated.category,
        subcategory: updated.subcategory,
      })
      .eq("id", tourId);
  } catch (err) {
    console.warn("Could not sync tour_type/category/subcategory to Supabase:", err);
  }

  return updated;
}
