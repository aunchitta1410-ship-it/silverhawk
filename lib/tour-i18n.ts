/**
 * Multilingual Translation and Search Indexing for Tours
 * Supports English (en), Thai (th), and Simplified Chinese (zh).
 */

export const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");

export type LocalizedText = {
  en: string;
  th: string;
  zh: string;
};

// ============================================================================
// 1. Destinations Mapping
// ============================================================================
export const DESTINATIONS_I18N: Record<string, LocalizedText> = {
  "phuket": {
    en: "Phuket",
    th: "ภูเก็ต",
    zh: "普吉岛",
  },
  "phang nga": {
    en: "Phang Nga",
    th: "พังงา",
    zh: "攀牙",
  },
  "phang-nga": {
    en: "Phang Nga",
    th: "พังงา",
    zh: "攀牙",
  },
  "phang nga ": {
    en: "Phang Nga",
    th: "พังงา",
    zh: "攀牙",
  },
  "phang-nga bay": {
    en: "Phang Nga Bay",
    th: "อ่าวพังงา",
    zh: "攀牙湾",
  },
  "krabi": {
    en: "Krabi",
    th: "กระบี่",
    zh: "甲米",
  },
  "phi phi": {
    en: "Phi Phi Island",
    th: "เกาะพีพี",
    zh: "皮皮岛",
  },
  "similan": {
    en: "Similan Islands",
    th: "หมู่เกาะสิมิลัน",
    zh: "斯米兰群岛",
  },
  "racha": {
    en: "Racha Island",
    th: "เกาะราชา",
    zh: "皇帝岛",
  },
  "coral island": {
    en: "Coral Island",
    th: "เกาะเฮ",
    zh: "珊瑚岛",
  },
};

// ============================================================================
// 2. Categories Mapping
// ============================================================================
export const CATEGORIES_I18N: Record<string, LocalizedText> = {
  "island & marine": {
    en: "Island & Marine",
    th: "เกาะและทางทะเล",
    zh: "海岛与海洋",
  },
  "adventure & eco": {
    en: "Adventure & Eco",
    th: "ผจญภัยและธรรมชาติ",
    zh: "探险与生态",
  },
  "cultural & community": {
    en: "Cultural & Community",
    th: "วัฒนธรรมและชุมชน",
    zh: "文化与社区",
  },
  "transfers & charters": {
    en: "Transfers & Charters",
    th: "บริการรับส่งและเช่าเหมาลำ",
    zh: "接送与包车",
  },
  "tickets & attractions": {
    en: "Tickets & Attractions",
    th: "บัตรเข้าชมและสถานที่ท่องเที่ยว",
    zh: "门票与景点",
  },
  "ticket only": {
    en: "Tickets & Attractions",
    th: "บัตรเข้าชมและสถานที่ท่องเที่ยว",
    zh: "门票与景点",
  },
};

// ============================================================================
// 3. Subcategories Mapping
// ============================================================================
export const SUBCATEGORIES_I18N: Record<string, LocalizedText> = {
  "one day trip": {
    en: "One Day Trip",
    th: "ทริปวันเดียว",
    zh: "一日游",
  },
  "unmissable island": {
    en: "Unmissable Island",
    th: "เกาะยอดนิยม",
    zh: "必去海岛",
  },
  "speedboat tour": {
    en: "Speedboat Tour",
    th: "ทัวร์สปีดโบ๊ท",
    zh: "快艇之旅",
  },
  "catamaran cruise": {
    en: "Catamaran Cruise",
    th: "ล่องเรือคาตามารัน",
    zh: "双体游船",
  },
  "sunset cruise": {
    en: "Sunset Cruise",
    th: "ล่องเรือชมพระอาทิตย์ตก",
    zh: "日落巡航",
  },
  "snorkeling & diving": {
    en: "Snorkeling & Diving",
    th: "ดำน้ำตื้นและดำน้ำลึก",
    zh: "浮潜与潜水",
  },
  "atv riding": {
    en: "ATV Riding",
    th: "ขับขี่ ATV",
    zh: "ATV越野车",
  },
  "zipline & canopy": {
    en: "Zipline & Canopy",
    th: "ซิปไลน์และเรือนยอดไม้",
    zh: "高空滑索与树冠漫步",
  },
  "elephant sanctuary": {
    en: "Elephant Sanctuary",
    th: "ศูนย์อนุรักษ์ช้าง",
    zh: "大象保护营",
  },
  "jungle trekking": {
    en: "Jungle Trekking",
    th: "เดินป่า",
    zh: "丛林徒步",
  },
  "regenerative & sustainable": {
    en: "Regenerative & Sustainable",
    th: "ท่องเที่ยวฟื้นฟูและยั่งยืน",
    zh: "可持续与再生旅游",
  },
  "education camp": {
    en: "Education Camp",
    th: "ค่ายการเรียนรู้",
    zh: "研学夏令营",
  },
  "community tour": {
    en: "Community Tour",
    th: "ทัวร์ชุมชน",
    zh: "社区探索之旅",
  },
  "heritage walk": {
    en: "Heritage Walk",
    th: "เดินชมมรดกวัฒนธรรม",
    zh: "历史文化漫步",
  },
  "cooking class & workshop": {
    en: "Cooking Class & Workshop",
    th: "คลาสทำอาหารและเวิร์กช็อป",
    zh: "烹饪课与工坊",
  },
  "local village life": {
    en: "Local Village Life",
    th: "วิถีชีวิตหมู่บ้านท้องถิ่น",
    zh: "乡村民俗体验",
  },
  "airport transfer": {
    en: "Airport Transfer",
    th: "รับส่งสนามบิน",
    zh: "机场接送",
  },
  "hotel transfer": {
    en: "Hotel Transfer",
    th: "รับส่งโรงแรม",
    zh: "酒店接送",
  },
  "private yacht charter": {
    en: "Private Yacht Charter",
    th: "เช่าเหมาเรือยอชท์ส่วนตัว",
    zh: "私人游艇包船",
  },
  "vip luxury van": {
    en: "VIP Luxury Van",
    th: "รถตู้ VIP หรูหรา",
    zh: "豪华VIP商务车",
  },
  "theme & water parks": {
    en: "Theme & Water Parks",
    th: "สวนสนุกและสวนน้ำ",
    zh: "主题乐园与水上乐园",
  },
  "cultural shows & cabaret": {
    en: "Cultural Shows & Cabaret",
    th: "การแสดงวัฒนธรรมและคาบาเรต์",
    zh: "文化表演与人妖秀",
  },
  "animal & wildlife sanctuaries": {
    en: "Animal & Wildlife Sanctuaries",
    th: "เขตอนุรักษ์สัตว์และสัตว์ป่า",
    zh: "动物与野生动物保护区",
  },
  "museums & art galleries": {
    en: "Museums & Art Galleries",
    th: "พิพิธภัณฑ์และหอศิลป์",
    zh: "博物馆与艺术馆",
  },
  "observation decks & viewpoints": {
    en: "Observation Decks & Viewpoints",
    th: "จุดชมวิว",
    zh: "观景台与全景观光",
  },
  "dinner cruises & shows": {
    en: "Dinner Cruises & Shows",
    th: "ดินเนอร์ล่องเรือและการแสดง",
    zh: "晚餐游船与表演",
  },
};

// ============================================================================
// 4. Tour Types Mapping
// ============================================================================
export const TOUR_TYPES_I18N: Record<string, LocalizedText> = {
  "tour package": {
    en: "Tour Package",
    th: "แพ็กเกจทัวร์",
    zh: "旅游套餐",
  },
  "package": {
    en: "Tour Package",
    th: "แพ็กเกจทัวร์",
    zh: "旅游套餐",
  },
  "ticket only": {
    en: "Ticket Only",
    th: "เฉพาะบัตรเข้าชม",
    zh: "仅门票",
  },
  "transfer only": {
    en: "Transfer Only",
    th: "เฉพาะบริการรับส่ง",
    zh: "仅接送",
  },
  "private tour": {
    en: "Private Tour",
    th: "ทัวร์ส่วนตัว",
    zh: "私人包车/团",
  },
  "activity only": {
    en: "Activity Only",
    th: "เฉพาะกิจกรรม",
    zh: "单项活动",
  },
  "one day trip": {
    en: "One Day Trip",
    th: "ทริปวันเดียว",
    zh: "一日游",
  },
  "community tour": {
    en: "Community Tour",
    th: "ทัวร์ชุมชน",
    zh: "社区探索",
  },
  "education camp": {
    en: "Education Camp",
    th: "ค่ายการเรียนรู้",
    zh: "研学营",
  },
  "phuket regenerative trip": {
    en: "Phuket Regenerative Trip",
    th: "ทริปฟื้นฟูธรรมชาติภูเก็ต",
    zh: "普吉岛再生自然之旅",
  },
  "phuket sustainable tour": {
    en: "Phuket Sustainable Tour",
    th: "ทัวร์ยั่งยืนภูเก็ต",
    zh: "普吉岛可持续旅游",
  },
};

// ============================================================================
// 5. Keyword & Concept Synonyms for Cross-Language Search
// When English words appear in title/description/destination/category,
// these Thai & Chinese terms are automatically added to the search index.
// ============================================================================
export const TRAVEL_SYNONYMS: Array<{ match: RegExp; th: string; zh: string }> = [
  { match: /phuket/i, th: "ภูเก็ต ในภูเก็ต", zh: "普吉 普吉岛" },
  { match: /phang\s*nga/i, th: "พังงา อ่าวพังงา", zh: "攀牙 攀牙湾" },
  { match: /krabi/i, th: "กระบี่", zh: "甲米" },
  { match: /phi\s*phi/i, th: "พีพี เกาะพีพี", zh: "皮皮 皮皮岛" },
  { match: /coral/i, th: "เกาะเฮ คอรัล", zh: "珊瑚 珊瑚岛" },
  { match: /raya|racha/i, th: "เกาะราชา เกาะรายา ราชา รายา", zh: "皇帝 皇帝岛 拉查岛" },
  { match: /khai/i, th: "เกาะไข่", zh: "蛋岛 凯岛" },
  { match: /james\s*bond/i, th: "เจมส์บอนด์ เกาะเจมส์บอนด์", zh: "007 007岛 詹姆斯邦德" },
  { match: /similan/i, th: "สิมิลัน เกาะสิมิลัน", zh: "斯米兰 斯米兰群岛" },
  { match: /carnival\s*magic/i, th: "คาร์นิวัล เมจิก", zh: "嘉年华 魔法嘉年华" },
  { match: /siam\s*niramit/i, th: "สยามนิรมิต", zh: "暹罗梦幻剧场" },
  { match: /elephant/i, th: "ช้าง ศูนย์อนุรักษ์ช้าง", zh: "大象 大象保护营" },
  { match: /cooking/i, th: "ทำอาหาร คลาสทำอาหาร สอนทำอาหาร", zh: "烹饪 厨艺 做菜" },
  { match: /food/i, th: "อาหาร ชิมอาหาร สตรีทฟู้ด", zh: "美食 美味 佳肴" },
  { match: /sunset/i, th: "พระอาทิตย์ตก ซันเซ็ท ชมอาทิตย์อัสดง", zh: "日落 夕阳 傍晚" },
  { match: /sunrise/i, th: "พระอาทิตย์ขึ้น", zh: "日出 清晨" },
  { match: /catamaran/i, th: "คาตามารัน เรือคาตามารัน", zh: "双体船 双体帆船" },
  { match: /speedboat/i, th: "สปีดโบ๊ท เรือเร็ว", zh: "快艇 飞艇" },
  { match: /yacht/i, th: "เรือยอชท์ ยอชต์", zh: "游艇 帆船" },
  { match: /boat|cruise|tour|trip/i, th: "เรือ ล่องเรือ ทัวร์ เที่ยว การเดินทาง", zh: "游船 船 游 旅游 旅行 巡航" },
  { match: /island/i, th: "เกาะ หมู่เกาะ ชายหาด ทะเล", zh: "海岛 岛 岛屿 沙滩 海滩" },
  { match: /diving|scuba|snorkel/i, th: "ดำน้ำ ดำน้ำตื้น ดำน้ำลึก ปะการัง", zh: "潜水 浮潜 深潜 水肺 珊瑚" },
  { match: /fishing/i, th: "ตกปลา ตกปลาทะเล ตกหมึก", zh: "海钓 钓鱼 捕鱼" },
  { match: /atv/i, th: "เอทีวี ขับขี่เอทีวี รถวิบาก", zh: "越野车 ATV 四驱车" },
  { match: /zipline/i, th: "ซิปไลน์ โหนสลิง", zh: "滑索 丛林飞跃 索道" },
  { match: /city|town/i, th: "เมือง ตัวเมือง เมืองเก่า", zh: "城市 市区 老城 观光" },
  { match: /ticket/i, th: "บัตร บัตรเข้าชม ตั๋ว", zh: "门票 门票预订 入场券" },
  { match: /park|water\s*park/i, th: "สวนสนุก สวนน้ำ", zh: "水上乐园 乐园 公园" },
  { match: /spa|massage/i, th: "สปา นวด นวดแผนไทย", zh: "水疗 按摩 泰式按摩" },
  { match: /market/i, th: "ตลาด ตลาดนัด ถนนคนเดิน", zh: "市集 夜市 市场" },
  { match: /private/i, th: "ส่วนตัว เหมาลำ เหมาคัน", zh: "私人 包车 包船 独家" },
];

// ============================================================================
// Localized Getters
// ============================================================================
export function getLocalizedDestination(
  destination: string | null | undefined,
  locale: string
): string {
  if (!destination) return "";
  const key = normalizeText(destination);
  const found = DESTINATIONS_I18N[key];
  if (!found) return destination.trim();
  if (locale === "th") return found.th;
  if (locale === "zh") return found.zh;
  return found.en;
}

export function getLocalizedCategory(
  category: string | null | undefined,
  locale: string
): string {
  if (!category) return "";
  const key = normalizeText(category);
  const found = CATEGORIES_I18N[key];
  if (!found) return category.trim();
  if (locale === "th") return found.th;
  if (locale === "zh") return found.zh;
  return found.en;
}

export function getLocalizedSubcategory(
  subcategory: string | null | undefined,
  locale: string
): string {
  if (!subcategory) return "";
  const key = normalizeText(subcategory);
  const found = SUBCATEGORIES_I18N[key];
  if (!found) return subcategory.trim();
  if (locale === "th") return found.th;
  if (locale === "zh") return found.zh;
  return found.en;
}

export function getLocalizedTourType(
  tourType: string | null | undefined,
  locale: string
): string {
  if (!tourType) return "";
  const key = normalizeText(tourType);
  const found = TOUR_TYPES_I18N[key];
  if (!found) return tourType.trim();
  if (locale === "th") return found.th;
  if (locale === "zh") return found.zh;
  return found.en;
}

// ============================================================================
// Searchable Text Builder
// Enriches tour with localized terms and travel synonyms across all languages.
// ============================================================================
export type BasicTourSearchable = {
  title_en?: string | null;
  title_th?: string | null;
  title_zh?: string | null;
  description_en?: string | null;
  description_th?: string | null;
  description_zh?: string | null;
  destination?: string | null;
  tour_type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  duration?: string | number | null;
};

export function buildSearchableTourText(tour: BasicTourSearchable): string {
  const parts: string[] = [
    tour.title_en ?? "",
    tour.title_th ?? "",
    tour.title_zh ?? "",
    tour.description_en ?? "",
    tour.description_th ?? "",
    tour.description_zh ?? "",
    tour.destination ?? "",
    tour.tour_type ?? "",
    tour.category ?? "",
    tour.subcategory ?? "",
    String(tour.duration ?? ""),
  ];

  // Localized destination
  const destKey = normalizeText(tour.destination);
  if (DESTINATIONS_I18N[destKey]) {
    parts.push(
      DESTINATIONS_I18N[destKey].en,
      DESTINATIONS_I18N[destKey].th,
      DESTINATIONS_I18N[destKey].zh
    );
  }

  // Localized category
  const catKey = normalizeText(tour.category);
  if (CATEGORIES_I18N[catKey]) {
    parts.push(
      CATEGORIES_I18N[catKey].en,
      CATEGORIES_I18N[catKey].th,
      CATEGORIES_I18N[catKey].zh
    );
  }

  // Localized subcategory
  const subcatKey = normalizeText(tour.subcategory);
  if (SUBCATEGORIES_I18N[subcatKey]) {
    parts.push(
      SUBCATEGORIES_I18N[subcatKey].en,
      SUBCATEGORIES_I18N[subcatKey].th,
      SUBCATEGORIES_I18N[subcatKey].zh
    );
  }

  // Localized tour type
  const typeKey = normalizeText(tour.tour_type);
  if (TOUR_TYPES_I18N[typeKey]) {
    parts.push(
      TOUR_TYPES_I18N[typeKey].en,
      TOUR_TYPES_I18N[typeKey].th,
      TOUR_TYPES_I18N[typeKey].zh
    );
  }

  // Combined text to scan for keyword synonyms
  const combined = parts.filter(Boolean).join(" ");

  for (const item of TRAVEL_SYNONYMS) {
    if (item.match.test(combined)) {
      parts.push(item.th, item.zh);
    }
  }

  return normalizeText(parts.filter(Boolean).join(" "));
}

// ============================================================================
// Multi-token Matching Engine
// Checks both exact substring and space-separated multi-token AND matches.
// ============================================================================
export function matchesSearchQuery(
  searchableText: string,
  searchKeyword: string
): boolean {
  const normalizedKeyword = normalizeText(searchKeyword);
  if (!normalizedKeyword) return true;

  // 1. Direct contiguous match (fastest)
  if (searchableText.includes(normalizedKeyword)) {
    return true;
  }

  // 2. Multi-token match (when user searches words separated by space, e.g. "ภูเก็ต ทัวร์" or "普吉 潜水")
  const tokens = normalizedKeyword.split(" ").filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => searchableText.includes(token));
  }

  return false;
}

// ============================================================================
// Destination Filter Matching (Language-Agnostic)
// ============================================================================
export function isDestinationMatch(
  tourDestination: string | null | undefined,
  filterDestination: string
): boolean {
  if (!filterDestination || !filterDestination.trim()) return true;
  if (!tourDestination) return false;

  const normTour = normalizeText(tourDestination);
  const normFilter = normalizeText(filterDestination);

  // Exact or direct substring match
  if (
    normTour === normFilter ||
    normTour.includes(normFilter) ||
    normFilter.includes(normTour)
  ) {
    return true;
  }

  // Compare localized aliases
  const tourLoc = DESTINATIONS_I18N[normTour];
  if (tourLoc) {
    if (
      normalizeText(tourLoc.en) === normFilter ||
      normalizeText(tourLoc.th) === normFilter ||
      normalizeText(tourLoc.zh) === normFilter ||
      normFilter.includes(normalizeText(tourLoc.th)) ||
      normalizeText(tourLoc.th).includes(normFilter) ||
      normFilter.includes(normalizeText(tourLoc.zh)) ||
      normalizeText(tourLoc.zh).includes(normFilter)
    ) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Category Filter Matching (Language-Agnostic)
// ============================================================================
export function isCategoryMatch(
  tourCategory: string | null | undefined,
  filterCategory: string
): boolean {
  if (!filterCategory || !filterCategory.trim()) return true;
  if (!tourCategory) return false;

  const normTour = normalizeText(tourCategory);
  const normFilter = normalizeText(filterCategory);

  // Exact or direct substring match
  if (
    normTour === normFilter ||
    normTour.includes(normFilter) ||
    normFilter.includes(normTour)
  ) {
    return true;
  }

  // Compare localized aliases
  const catLoc = CATEGORIES_I18N[normTour];
  if (catLoc) {
    if (
      normalizeText(catLoc.en) === normFilter ||
      normalizeText(catLoc.th) === normFilter ||
      normalizeText(catLoc.zh) === normFilter ||
      normFilter.includes(normalizeText(catLoc.th)) ||
      normalizeText(catLoc.th).includes(normFilter) ||
      normFilter.includes(normalizeText(catLoc.zh)) ||
      normalizeText(catLoc.zh).includes(normFilter)
    ) {
      return true;
    }
  }

  return false;
}
