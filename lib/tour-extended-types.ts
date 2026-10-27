export type TourType =
  | "Tour Package"
  | "Ticket Only"
  | "Transfer Only"
  | "Private Tour"
  | "Activity Only";

export type CookingProgram = {
  id: string;
  name: string;
  cooking_price: number;
  non_cooking_price: number;
  menus_count: number;
  includes_market_tour: boolean;
  notes?: string;
};

export type CookingPrivateTier = {
  id: string;
  class_type: "Half Day" | "Full Day";
  menus_count: number;
  tier_label: string;
  min_pax: number;
  max_pax: number;
  price: number;
};

export type CookingClassDetails = {
  programs: CookingProgram[];
  private_tiers: CookingPrivateTier[];
  extra_dish_price?: number;
};

export type ActivityPackageOption = {
  id: string;
  name: string;
  duration?: string;
  driver_price: number;
  passenger_price: number;
  child_price?: number;
  description?: string;
};

export type ActivityPricingDetails = {
  packages: ActivityPackageOption[];
  session_slots?: string[];
};

export type TransferRouteItem = {
  id: string;
  service_title?: string;
  schedule_route: string;
  departure_pier: string;
  arrival_pier: string;
  departure_time: string;
  arrival_time: string;
  adult_price: number;
  child_price: number;
  boat_type?: string;
};

export type PricingModel = "standard" | "cooking_class" | "activity_atv" | "transfer_timetable";

export type CustomField = {
  id: string;
  name_en: string;
  name_th?: string;
  name_zh?: string;
  value_en: string;
  value_th?: string;
  value_zh?: string;
};

export type CustomTicketType = {
  id: string;
  name_en: string;
  name_th?: string;
  name_zh?: string;
  price: number;
  adult_price?: number;
  child_price?: number;
  child_height_note?: string; // e.g. "Height 101 - 140 cm (3'3\" - 4'7\")"
  description_en?: string;
  description_th?: string;
  description_zh?: string;
};

export type OptionalAddon = {
  id: string;
  name_en: string;
  name_th?: string;
  name_zh?: string;
  price: number;
  price_type: "per_person" | "per_booking";
  description_en?: string;
  description_th?: string;
  description_zh?: string;
};

export type CustomBookingField = {
  id: string;
  label_en: string;
  label_th?: string;
  label_zh?: string;
  field_type: "text" | "select" | "checkbox";
  options?: string[];
  required: boolean;
  placeholder_en?: string;
};

export type LocalizedRuleItem = {
  id: string;
  en: string;
  th?: string;
  zh?: string;
};

export type TourExtendedData = {
  tourId: number;
  custom_tour_id?: string;
  tour_order?: number;
  tour_type: TourType;
  category: string;
  subcategory: string;
  charges_extra_pickup_fee: boolean; // false = everything included in tour; true = charges extra for pickup
  not_recommended: (string | LocalizedRuleItem)[];
  tour_includes: (string | LocalizedRuleItem)[];
  tour_excludes: (string | LocalizedRuleItem)[];
  what_to_bring: (string | LocalizedRuleItem)[];
  gallery_images: string[];
  custom_fields?: CustomField[];
  ticket_types?: CustomTicketType[];
  optional_addons?: OptionalAddon[];
  custom_booking_fields?: CustomBookingField[];
  // Specialized Rate Designs
  pricing_model?: PricingModel;
  cooking_class_details?: CookingClassDetails;
  activity_pricing?: ActivityPricingDetails;
  transfer_routes?: TransferRouteItem[];
  // Type-specific metadata
  ticket_details?: {
    venue_address?: string;
    redemption_point?: string;
    validity_notes?: string;
    admission_hours?: string;
    show_times?: string[]; // e.g. ["17:30", "19:30", "20:30"]
    show_dates?: string[]; // specific show dates/schedule
    daily_shows_count?: number; // 1, 2, or 3 shows
    has_transfer_addon?: boolean; // offer hotel transfer addon for ticket only
    transfer_price?: number; // transfer fee per person in THB (e.g. 350)
    unit?: string; // e.g. "per ticket", "per admission pass", "per seat"
    custom_details?: CustomField[]; // customizable ticket detail fields (add/remove freely per ticket/tour)
  };
  transfer_details?: {
    service_type?: "Airport Transfer" | "Hotel Transfer" | "Point-to-Point";
    vehicle_types?: string[];
    pickup_zones?: string[];
    dropoff_zones?: string[];
    luggage_policy?: string;
  };
  activity_details?: {
    activity_name?: string;
    session_slots?: string[];
    duration?: string;
    equipment_provided?: string[];
    safety_requirements?: string;
  };
  private_details?: {
    charter_type?: "Private Yacht" | "Private Speedboat" | "VIP Van" | "Custom Charter";
    max_capacity?: number;
    charter_duration?: string;
    customizable_itinerary?: boolean;
  };
  // Child & Infant Height Policies
  child_height_min?: number; // e.g. 101 (cm)
  child_height_max?: number; // e.g. 140 (cm)
  infant_height_max?: number; // e.g. 100 (cm)
  child_height_note?: string; // e.g. "Height 101 - 140 cm (3'3\" - 4'7\"). Children under 100 cm free of charge."
  // Partner Company Details
  partner_details?: {
    partner_company?: string;
    partner_tour_code?: string;
    contact_email?: string;
    contact_phone?: string;
    commission_rate?: string | number;
    lead_time_hours?: number;
    notes?: string;
  };
  // Product-level Policy Overrides
  custom_cancellation_policy?: {
    override: boolean;
    summary_en?: string;
    summary_th?: string;
    summary_zh?: string;
    refund_conditions_en?: string;
    refund_conditions_th?: string;
    refund_conditions_zh?: string;
    reschedule_policy_en?: string;
    reschedule_policy_th?: string;
    reschedule_policy_zh?: string;
    weather_or_noshow_clause_en?: string;
    weather_or_noshow_clause_th?: string;
    weather_or_noshow_clause_zh?: string;
  };
  custom_pdpa_policy?: {
    override: boolean;
    required_info_en?: string;
    required_info_th?: string;
    required_info_zh?: string;
    purpose_en?: string;
    purpose_th?: string;
    purpose_zh?: string;
    additional_disclosures_en?: string;
    additional_disclosures_th?: string;
    additional_disclosures_zh?: string;
  };
};

export const PRESET_CATEGORIES: Record<string, string[]> = {
  "Island & Marine": [
    "One Day Trip",
    "Unmissable Island",
    "Speedboat Tour",
    "Catamaran Cruise",
    "Sunset Cruise",
    "Snorkeling & Diving",
  ],
  "Adventure & Eco": [
    "ATV Riding",
    "Zipline & Canopy",
    "Elephant Sanctuary",
    "Jungle Trekking",
    "Regenerative & Sustainable",
    "Education Camp",
  ],
  "Cultural & Community": [
    "Community Tour",
    "Heritage Walk",
    "Cooking Class & Workshop",
    "Local Village Life",
  ],
  "Transfers & Charters": [
    "Airport Transfer",
    "Hotel Transfer",
    "Private Yacht Charter",
    "VIP Luxury Van",
  ],
  "Tickets & Attractions": [
    "Theme & Water Parks",
    "Cultural Shows & Cabaret",
    "Animal & Wildlife Sanctuaries",
    "Museums & Art Galleries",
    "Observation Decks & Viewpoints",
    "Dinner Cruises & Shows",
  ],
  "Ticket Only": [
    "Theme & Water Parks",
    "Cultural Shows & Cabaret",
    "Animal & Wildlife Sanctuaries",
    "Museums & Art Galleries",
    "Observation Decks & Viewpoints",
    "Dinner Cruises & Shows",
  ],
};

export const DEFAULT_COOKING_CLASS: CookingClassDetails = {
  programs: [
    {
      id: "cook_prog_a",
      name: "Program A (Join)",
      menus_count: 4,
      includes_market_tour: true,
      cooking_price: 2800,
      non_cooking_price: 1500,
      notes: "Choose the menu on the day that customers come to study",
    },
    {
      id: "cook_prog_b",
      name: "Program B (Join)",
      menus_count: 3,
      includes_market_tour: true,
      cooking_price: 2500,
      non_cooking_price: 1300,
      notes: "Choose the menu on the day that customers come to study",
    },
  ],
  private_tiers: [
    { id: "priv_hd_1", class_type: "Half Day", menus_count: 4, tier_label: "1-5 Pax", min_pax: 1, max_pax: 5, price: 15000 },
    { id: "priv_hd_2", class_type: "Half Day", menus_count: 4, tier_label: "6-8 Pax", min_pax: 6, max_pax: 8, price: 24000 },
    { id: "priv_hd_3", class_type: "Half Day", menus_count: 4, tier_label: "9-16 Pax", min_pax: 9, max_pax: 16, price: 42000 },
    { id: "priv_fd_1", class_type: "Full Day", menus_count: 7, tier_label: "1-5 Pax", min_pax: 1, max_pax: 5, price: 22000 },
    { id: "priv_fd_2", class_type: "Full Day", menus_count: 7, tier_label: "6-8 Pax", min_pax: 6, max_pax: 8, price: 40000 },
    { id: "priv_fd_3", class_type: "Full Day", menus_count: 7, tier_label: "9-16 Pax", min_pax: 9, max_pax: 16, price: 65000 },
  ],
  extra_dish_price: 1000,
};

export const DEFAULT_ACTIVITY_ATV: ActivityPricingDetails = {
  packages: [
    {
      id: "atv_30m",
      name: "ATV 30 Mins (Big Buddha Mountain Trail)",
      duration: "30 Mins",
      driver_price: 1000,
      passenger_price: 700,
      child_price: 700,
      description: "Exciting 30-minute off-road adventure through tropical mountain terrain to scenic Big Buddha trail.",
    },
    {
      id: "atv_1hr",
      name: "ATV 1 Hour (Big Buddha Panoramic Experience)",
      duration: "1 Hour",
      driver_price: 1700,
      passenger_price: 1200,
      child_price: 1200,
      description: "Full 60-minute ride along jungle tracks, panoramic ocean viewpoints, and Big Buddha base.",
    },
    {
      id: "atv_2hr",
      name: "ATV 2 Hours (Extreme Island Explorer)",
      duration: "2 Hours",
      driver_price: 2900,
      passenger_price: 2000,
      child_price: 2000,
      description: "Ultimate 2-hour expedition deep into Phuket rainforest ridges with mountain viewpoints.",
    },
    {
      id: "atv_zip",
      name: "ATV 1 Hr + Zipline 16 Platforms Combo",
      duration: "2.5 Hours",
      driver_price: 2500,
      passenger_price: 2000,
      child_price: 2000,
      description: "Combination package: 1 Hour ATV riding plus 16 thrilling zipline tree canopy platforms.",
    },
  ],
  session_slots: ["08:30", "10:30", "13:00", "15:00", "17:00"],
};

export const DEFAULT_TRANSFER_ROUTES: TransferRouteItem[] = [
  { id: "tr_1", service_title: "Speedboat transfer service", schedule_route: "Phuket - Phi Phi Island", departure_pier: "Rassada Pier", arrival_pier: "Tonsai Pier", departure_time: "09:30", arrival_time: "10:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_2", service_title: "Speedboat transfer service", schedule_route: "Phuket - Phi Phi Island", departure_pier: "Rassada Pier", arrival_pier: "Tonsai Pier", departure_time: "10:30", arrival_time: "11:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_3", service_title: "Speedboat transfer service", schedule_route: "Phuket - Phi Phi Island", departure_pier: "Rassada Pier", arrival_pier: "Tonsai Pier", departure_time: "14:00", arrival_time: "15:00", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_4", service_title: "Speedboat transfer service", schedule_route: "Phuket - Phi Phi Island", departure_pier: "Rassada Pier", arrival_pier: "Tonsai Pier", departure_time: "15:30", arrival_time: "16:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_5", service_title: "Speedboat transfer service", schedule_route: "Phi Phi Island - Phuket", departure_pier: "Tonsai Pier", arrival_pier: "Rassada Pier", departure_time: "08:30", arrival_time: "09:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_6", service_title: "Speedboat transfer service", schedule_route: "Phi Phi Island - Phuket", departure_pier: "Tonsai Pier", arrival_pier: "Rassada Pier", departure_time: "12:00", arrival_time: "13:00", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_7", service_title: "Speedboat transfer service", schedule_route: "Phi Phi Island - Phuket", departure_pier: "Tonsai Pier", arrival_pier: "Rassada Pier", departure_time: "13:00", arrival_time: "14:00", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_8", service_title: "Speedboat transfer service", schedule_route: "Phi Phi Island - Phuket", departure_pier: "Tonsai Pier", arrival_pier: "Rassada Pier", departure_time: "15:30", arrival_time: "16:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_9", service_title: "Speedboat transfer service", schedule_route: "Phuket - Laemtong Beach", departure_pier: "Rassada Pier", arrival_pier: "Laemtong Beach", departure_time: "14:00", arrival_time: "15:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_10", service_title: "Speedboat transfer service", schedule_route: "Laemtong Beach - Phuket", departure_pier: "Laemtong Beach", arrival_pier: "Rassada Pier", departure_time: "07:50", arrival_time: "09:30", adult_price: 1500, child_price: 1300, boat_type: "Speedboat" },
  { id: "tr_11", service_title: "Speedboat transfer service", schedule_route: "Ao Po Grand Marina - Laemtong Beach", departure_pier: "Ao Po Grand Marina", arrival_pier: "Laemtong Beach", departure_time: "11:30", arrival_time: "12:30", adult_price: 1800, child_price: 1600, boat_type: "Speedboat" },
  { id: "tr_12", service_title: "Speedboat transfer service", schedule_route: "Ao Po Grand Marina - Laemtong Beach", departure_pier: "Ao Po Grand Marina", arrival_pier: "Laemtong Beach", departure_time: "16:00", arrival_time: "17:00", adult_price: 1800, child_price: 1600, boat_type: "Speedboat" },
  { id: "tr_13", service_title: "Speedboat transfer service", schedule_route: "Laemtong Beach - Ao Po Grand Marina", departure_pier: "Laemtong Beach", arrival_pier: "Ao Po Grand Marina", departure_time: "10:00", arrival_time: "11:00", adult_price: 1800, child_price: 1600, boat_type: "Speedboat" },
  { id: "tr_14", service_title: "Speedboat transfer service", schedule_route: "Laemtong Beach - Ao Po Grand Marina", departure_pier: "Laemtong Beach", arrival_pier: "Ao Po Grand Marina", departure_time: "14:00", arrival_time: "15:00", adult_price: 1800, child_price: 1600, boat_type: "Speedboat" },
  { id: "tr_15", service_title: "Speedboat transfer service", schedule_route: "Phuket - Phi Phi Island - Krabi", departure_pier: "Rassada Pier", arrival_pier: "Railay / Ao Nang (Kong Ka Pier)", departure_time: "09:30", arrival_time: "11:00", adult_price: 1800, child_price: 1600, boat_type: "Speedboat" },
];

export const PRESET_TICKET_TYPES: Omit<CustomTicketType, "id">[] = [
  {
    name_en: "Park Admission & Buffet Dinner",
    name_th: "บัตรเข้าชม + บุฟเฟต์อาหารค่ำ",
    name_zh: "入园门票 + 豪华自助晚餐",
    price: 2500,
    adult_price: 2500,
    child_price: 2400,
    child_height_note: "Height 101 – 140 cm (3'3\" – 4'7\")",
    description_en: "Full park admission plus grand international buffet dinner (Child height: 101-140 cm)",
    description_th: "บัตรเข้าชมพร้อมบุฟเฟต์มื้อค่ำ (ส่วนสูงเด็ก 101-140 ซม.)",
    description_zh: "全区通票含国际自助晚宴（儿童身高 101-140 厘米）",
  },
  {
    name_en: "Park Admission Only",
    name_th: "บัตรเข้าชมอย่างเดียว",
    name_zh: "仅入园门票",
    price: 2100,
    adult_price: 2100,
    child_price: 2100,
    child_height_note: "Height 101 – 140 cm (3'3\" – 4'7\")",
    description_en: "Full park & attraction access without dinner (Child height: 101-140 cm)",
    description_th: "เข้าชมสถานที่ทุกโซนทั่วไป ไม่รวมอาหาร (ส่วนสูงเด็ก 101-140 ซม.)",
    description_zh: "全区游玩门票，不含晚餐（儿童身高 101-140 厘米）",
  },
  {
    name_en: "Standard Admission Ticket",
    name_th: "บัตรเข้าชมมาตรฐาน",
    name_zh: "标准入园门票",
    price: 1500,
    adult_price: 1500,
    child_price: 1200,
    description_en: "Full park & attraction access during regular operating hours",
    description_th: "เข้าชมสถานที่สำหรับทุกโซนทั่วไปตามเวลาทำการปกติ",
    description_zh: "常规营业时间内全区通用门票",
  },
  {
    name_en: "VIP / Royal Seat Pass",
    name_th: "บัตรที่นั่งวีไอพี / รอยัลซีต",
    name_zh: "VIP贵宾席 / 皇家特等座",
    price: 2500,
    adult_price: 2500,
    child_price: 2200,
    description_en: "Prime central stage view with complimentary lounge access",
    description_th: "จุดชมวิวเวทีกึ่งกลางที่ดีที่สุดพร้อมเข้าใช้เลานจ์พิเศษ",
    description_zh: "剧场正中最佳观演席位，享贵宾休息室礼遇",
  },
  {
    name_en: "Admission + International Buffet",
    name_th: "บัตรเข้าชมพร้อมบุฟเฟต์นานาชาติ",
    name_zh: "门票 + 国际豪华自助餐",
    price: 2200,
    adult_price: 2200,
    child_price: 1900,
    description_en: "Full admission plus world-class buffet dinner",
    description_th: "เข้าชมสถานที่พร้อมบุฟเฟต์มื้อค่ำระดับพรีเมียม",
    description_zh: "含全区入场门票及高品质国际自助晚宴",
  },
  {
    name_en: "Fast Pass / Priority Access",
    name_th: "บัตรด่วนพิเศษ / ไม่ต้องต่อคิว",
    name_zh: "快速通行证 / 免排队手环",
    price: 800,
    adult_price: 800,
    child_price: 800,
    description_en: "Skip the regular lines at all major rides and attractions",
    description_th: "ลัดคิวเครื่องเล่นและจุดท่องเที่ยวหลักทั้งหมด",
    description_zh: "畅享所有热门游乐项目免排队快速专属通道",
  },
  {
    name_en: "Family Pass (2 Adults + 2 Children)",
    name_th: "แพ็กเกจครอบครัว (ผู้ใหญ่ 2 + เด็ก 2)",
    name_zh: "家庭套票（2大2小）",
    price: 4500,
    adult_price: 4500,
    child_price: 4500,
    description_en: "Complete family bundle package with savings",
    description_th: "แพ็กเกจสุดคุ้มสำหรับครอบครัว 4 ท่าน",
    description_zh: "超值全家四人畅游套票组合",
  },
];

export const DEFAULT_NOT_RECOMMENDED_LOCALIZED: LocalizedRuleItem[] = [
  {
    id: "nr_1",
    en: "Pregnant Women",
    th: "สตรีมีครรภ์",
    zh: "孕妇",
  },
  {
    id: "nr_2",
    en: "People with Heart Conditions",
    th: "ผู้มีโรคหัวใจหรือโรคประจำตัวร้ายแรง",
    zh: "患有心脏病等严重心血管疾病者",
  },
  {
    id: "nr_3",
    en: "People with Back or Neck Problems",
    th: "ผู้ที่มีปัญหาเกี่ยวกับกระดูกสันหลังหรือคอ",
    zh: "患有颈椎病或背部脊柱疾病者",
  },
  {
    id: "nr_4",
    en: "Infants under 1 year old",
    th: "ทารกอายุต่ำกว่า 1 ปี",
    zh: "1岁以下婴儿",
  },
  {
    id: "nr_5",
    en: "Wheelchair users / Mobility impaired (speedboat tours)",
    th: "ผู้ใช้เก้าอี้รถเข็น / ผู้มีความบกพร่องด้านการเคลื่อนไหว (ทัวร์เรือสปีดโบ๊ท)",
    zh: "轮椅使用者 / 行动不便者（快艇行程）",
  },
];

export const DEFAULT_INCLUDES_LOCALIZED: LocalizedRuleItem[] = [
  {
    id: "inc_1",
    en: "Roundtrip hotel transfer in air-conditioned vehicle",
    th: "รถตู้ปรับอากาศรับ-ส่งไปกลับจากโรงแรม",
    zh: "空调面包车往返酒店接送服务",
  },
  {
    id: "inc_2",
    en: "Professional English & Chinese speaking tour guide",
    th: "มัคคุเทศก์มืออาชีพสื่อสารภาษาอังกฤษและภาษาจีน",
    zh: "专业持证英文与中文双语导游",
  },
  {
    id: "inc_3",
    en: "Delicious buffet lunch with vegetarian options",
    th: "อาหารกลางวันแบบบุฟเฟต์แสนอร่อย พร้อมตัวเลือกอาหารมังสวิรัติ",
    zh: "丰富美味的自助午餐（含素食选项）",
  },
  {
    id: "inc_4",
    en: "Snorkeling equipment (mask, snorkel, life jacket)",
    th: "อุปกรณ์ดำน้ำตื้น (หน้ากาก, ท่อหายใจ, เสื้อชูชีพ)",
    zh: "浮潜装备（浮潜面镜、呼吸管、救生衣）",
  },
  {
    id: "inc_5",
    en: "Accident travel insurance coverage",
    th: "ประกันภัยอุบัติเหตุการเดินทางตามกฎหมาย",
    zh: "全程旅游意外人身保险保障",
  },
  {
    id: "inc_6",
    en: "Fresh tropical fruits, soft drinks, and cold drinking water",
    th: "ผลไม้สดตามฤดูกาล น้ำอัดลม และน้ำดื่มเย็นบริการตลอดทริป",
    zh: "当季热带新鲜水果、软饮及冷饮用水",
  },
  {
    id: "inc_7",
    en: "National Park admission fees (unless specified as local cash collection)",
    th: "ค่าธรรมเนียมเข้าอุทยานแห่งชาติ (ยกเว้นกรณีระบุว่าเก็บเป็นเงินสด ณ สถานที่จริง)",
    zh: "国家公园门票费（除特别注明需现场自理现金外）",
  },
];

export const DEFAULT_EXCLUDES_LOCALIZED: LocalizedRuleItem[] = [
  {
    id: "exc_1",
    en: "Gratuities and tips for tour guide and boat captain",
    th: "ทิปและเงินรางวัลสำหรับไกด์และกัปตันเรือตามความพึงพอใจ",
    zh: "导游与快艇船长小费（自愿原则）",
  },
  {
    id: "exc_2",
    en: "Personal expenses, souvenirs, and alcoholic beverages",
    th: "ค่าใช้จ่ายส่วนตัว ของที่ระลึก และเครื่องดื่มแอลกอฮอล์",
    zh: "个人消费、纪念品购买及酒精饮品",
  },
  {
    id: "exc_3",
    en: "Scuba diving equipment (available for rent at dive sites)",
    th: "อุปกรณ์ดำน้ำลึก Scuba (มีให้เช่า ณ จุดดำน้ำ)",
    zh: "深潜水肺装备（可在潜水点现场自费租赁）",
  },
  {
    id: "exc_4",
    en: "Optional water sports (e.g. Parasailing, Sea Walker, Banana Boat)",
    th: "กิจกรรมทางน้ำเสริม (เช่น พาราเซลลิ่ง, เดินใต้สมุทร ซีวอล์คเกอร์, บานาน่าโบ๊ท)",
    zh: "自选水上娱乐项目（如拖曳伞、海底漫步、香蕉船等）",
  },
  {
    id: "exc_5",
    en: "Hotel transfers outside designated free zones (if applicable)",
    th: "ค่าบริการรับ-ส่งนอกเขตพื้นที่บริการฟรี (ถ้ามี)",
    zh: "指定免费接送区域外的超区接送附加费（如有）",
  },
];

export const DEFAULT_WHAT_TO_BRING_LOCALIZED: LocalizedRuleItem[] = [
  {
    id: "wtb_1",
    en: "Swimwear and beach towel",
    th: "ชุดว่ายน้ำและผ้าเช็ดตัว",
    zh: "泳装与沙滩毛巾",
  },
  {
    id: "wtb_2",
    en: "Sunscreen (reef-safe recommended), sunglasses, and sun hat",
    th: "ครีมกันแดด (แนะนำแบบเป็นมิตรต่อปะการัง) แว่นกันแดด และหมวกกันแดด",
    zh: "防晒霜（建议环保防珊瑚白化型）、太阳镜及遮阳帽",
  },
  {
    id: "wtb_3",
    en: "Comfortable beach sandals or water shoes",
    th: "รองเท้าแตะเดินชายหาดหรือรองเท้าลุยน้ำสวมสบาย",
    zh: "舒适的沙滩拖鞋或溯溪涉水鞋",
  },
  {
    id: "wtb_4",
    en: "Copy of passport or digital passport photo (required for National Park registration)",
    th: "สำเนาหนังสือเดินทางหรือรูปถ่ายพาสปอร์ตในมือถือ (สำหรับลงทะเบียนเข้าอุทยานแห่งชาติ)",
    zh: "护照复印件或手机护照照片（用于国家公园登岛实名登记）",
  },
  {
    id: "wtb_5",
    en: "Pocket money in Thai Baht (THB) for small personal purchases",
    th: "เงินสดสกุลบาท (THB) สำหรับใช้จ่ายส่วนตัวเล็กน้อย",
    zh: "泰铢现金零钱（用于岛上小额自费消费）",
  },
  {
    id: "wtb_6",
    en: "Change of dry clothes",
    th: "ชุดเสื้อผ้าแห้งสำหรับเปลี่ยน",
    zh: "一套干燥换洗衣物",
  },
];

export const DEFAULT_NOT_RECOMMENDED: string[] = DEFAULT_NOT_RECOMMENDED_LOCALIZED.map((item) => item.en);
export const DEFAULT_INCLUDES: string[] = DEFAULT_INCLUDES_LOCALIZED.map((item) => item.en);
export const DEFAULT_EXCLUDES: string[] = DEFAULT_EXCLUDES_LOCALIZED.map((item) => item.en);
export const DEFAULT_WHAT_TO_BRING: string[] = DEFAULT_WHAT_TO_BRING_LOCALIZED.map((item) => item.en);

export function findDefaultTranslation(text: string): LocalizedRuleItem | undefined {
  const trimmed = (text || "").trim().toLowerCase();
  if (!trimmed) return undefined;
  const allDefaults = [
    ...DEFAULT_NOT_RECOMMENDED_LOCALIZED,
    ...DEFAULT_INCLUDES_LOCALIZED,
    ...DEFAULT_EXCLUDES_LOCALIZED,
    ...DEFAULT_WHAT_TO_BRING_LOCALIZED,
  ];
  return allDefaults.find(
    (item) =>
      item.en.trim().toLowerCase() === trimmed ||
      (item.th && item.th.trim().toLowerCase() === trimmed) ||
      (item.zh && item.zh.trim().toLowerCase() === trimmed)
  );
}

export function normalizeRuleItem(item: string | LocalizedRuleItem | unknown): LocalizedRuleItem {
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.en || parsed.name_en) {
          return {
            id: parsed.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            en: parsed.en || parsed.name_en || "",
            th: parsed.th || parsed.name_th || "",
            zh: parsed.zh || parsed.name_zh || "",
          };
        }
      } catch {
        // Fall through to plain text
      }
    }
    const matched = findDefaultTranslation(trimmed);
    if (matched) {
      return {
        id: matched.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        en: matched.en,
        th: matched.th || "",
        zh: matched.zh || "",
      };
    }
    return {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      en: trimmed,
      th: "",
      zh: "",
    };
  }

  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const id = (typeof obj.id === "string" ? obj.id : "") || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const en = (typeof obj.en === "string" ? obj.en : typeof obj.name_en === "string" ? obj.name_en : "") || "";
    let th = (typeof obj.th === "string" ? obj.th : typeof obj.name_th === "string" ? obj.name_th : "") || "";
    let zh = (typeof obj.zh === "string" ? obj.zh : typeof obj.name_zh === "string" ? obj.name_zh : "") || "";
    if ((!th || !zh) && en) {
      const matched = findDefaultTranslation(en);
      if (matched) {
        if (!th) th = matched.th || "";
        if (!zh) zh = matched.zh || "";
      }
    }
    return { id, en, th, zh };
  }

  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    en: String(item || ""),
    th: "",
    zh: "",
  };
}

export function getRuleItemText(item: string | LocalizedRuleItem | unknown, locale: string): string {
  if (!item) return "";
  const normalized = normalizeRuleItem(item);
  if (locale === "th") return normalized.th || normalized.en || normalized.zh || "";
  if (locale === "zh") return normalized.zh || normalized.en || normalized.th || "";
  return normalized.en || normalized.th || normalized.zh || "";
}
