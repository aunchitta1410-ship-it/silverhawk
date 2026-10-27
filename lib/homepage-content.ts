import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type MultilingualContent = {
  en: string;
  th: string;
  zh: string;
};

export type ServiceCardContent = {
  number: string;
  tag: MultilingualContent;
  title: MultilingualContent;
  description: MultilingualContent;
  features_en: string[];
  features_th: string[];
  features_zh: string[];
  image_url?: string;
};

export type MediaSectionContent = {
  eyebrow: MultilingualContent;
  title: MultilingualContent;
  description_1: MultilingualContent;
  description_2: MultilingualContent;
  image_url: string;
};

export type WhyChooseFeature = {
  title: MultilingualContent;
  description: MultilingualContent;
  icon?: string;
};

export type HomepageContent = {
  hero: {
    eyebrow: string;
    title: MultilingualContent;
    subtitle: MultilingualContent;
    bg_image_url?: string;
  };
  themes_header: {
    eyebrow: MultilingualContent;
    title: MultilingualContent;
    subtitle: MultilingualContent;
  };
  tours_header: {
    eyebrow: MultilingualContent;
    title: MultilingualContent;
    subtitle: MultilingualContent;
  };
  services_header: {
    eyebrow: MultilingualContent;
    title: MultilingualContent;
    subtitle: MultilingualContent;
  };
  service_01: ServiceCardContent;
  service_02: ServiceCardContent;
  service_03: ServiceCardContent;
  mice: MediaSectionContent;
  corporate_training: MediaSectionContent;
  why_choose_us: {
    title: MultilingualContent;
    features: WhyChooseFeature[];
  };
  about?: {
    title: MultilingualContent;
    description: MultilingualContent;
  };
  last_updated: string;
};


export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    eyebrow: "SILVER HAWK GROUP",
    title: {
      en: "Beyond the Crowds, Closer to Nature",
      th: "หลีกหนีความวุ่นวาย สัมผัสธรรมชาติอย่างใกล้ชิด",
      zh: "远离喧嚣，回归自然",
    },
    subtitle: {
      en: "Handpicked journeys across Phuket",
      th: "การเดินทางที่คัดสรรอย่างพิถีพิถันทั่วภูเก็ต",
      zh: "精选普吉岛深度旅行体验",
    },
    bg_image_url: "",
  },
  themes_header: {
    eyebrow: {
      en: "EXPLORE YOURSELF",
      th: "ค้นพบตัวตนของคุณ",
      zh: "探索自己",
    },
    title: {
      en: "7 Themes of Hero Traveler",
      th: "7 ธีมสำหรับนักเดินทาง",
      zh: "7种旅行者主题",
    },
    subtitle: {
      en: "Different travelers. A more meaningful world.",
      th: "นักเดินทางที่แตกต่าง เพื่อโลกแห่งการเดินทางที่มีความหมายยิ่งขึ้น",
      zh: "不同的旅行者，更有意义的世界。",
    },
  },
  tours_header: {
    eyebrow: {
      en: "JOURNEYS FOR EVERY STYLE",
      th: "การเดินทางสำหรับทุกสไตล์",
      zh: "适合每一种旅行风格",
    },
    title: {
      en: "All Tours",
      th: "ทัวร์ทั้งหมด",
      zh: "所有旅游",
    },
    subtitle: {
      en: "Explore your travel style",
      th: "ค้นพบรูปแบบการเดินทางที่ใช่สำหรับคุณ",
      zh: "探索属于您的旅行方式",
    },
  },
  services_header: {
    eyebrow: {
      en: "OUR SERVICES",
      th: "บริการของเรา",
      zh: "我们的服务",
    },
    title: {
      en: "Services Beyond Tours",
      th: "บริการที่มากกว่าการท่องเที่ยว",
      zh: "旅游之外的服务",
    },
    subtitle: {
      en: "Flexible and professional services designed to make your journey seamless.",
      th: "บริการที่ยืดหยุ่นและเป็นมืออาชีพ เพื่อให้ทุกการเดินทางสะดวกสบายและราบรื่น",
      zh: "提供专业而灵活的服务，让您的旅程更加轻松、舒适。",
    },
  },
  service_01: {
    number: "01",
    tag: {
      en: "TRANSFER",
      th: "บริการรับส่ง",
      zh: "接送服务",
    },
    title: {
      en: "Airport & VIP Transfer",
      th: "บริการรับส่งสนามบินและวีไอพี",
      zh: "接送服务",
    },
    description: {
      en: "Airport and hotel transfers, luxury VIP transfers, executive lounge and VIP arrival & departure services.",
      th: "บริการรับส่งสนามบินและโรงแรม รถรับส่งวีไอพี เลานจ์สำหรับผู้บริหาร และบริการต้อนรับหรือส่งผู้โดยสารวีไอพี",
      zh: "提供机场及酒店接送、豪华 VIP 接送、行政贵宾休息室以及 VIP 接机和送机服务。",
    },
    features_en: ["Airport & Hotel", "Luxury VIP", "Executive Lounge"],
    features_th: ["สนามบินและโรงแรม", "รถรับส่งวีไอพี", "เลานจ์ผู้บริหาร"],
    features_zh: ["机场及酒店接送", "豪华 VIP 接送", "行政贵宾休息室"],
    image_url: "",
  },
  service_02: {
    number: "02",
    tag: {
      en: "YACHT & BOAT",
      th: "เช่าเหมาลำเรือและเรือยอชต์",
      zh: "游艇及船只包租",
    },
    title: {
      en: "Yacht / Boat Charter",
      th: "บริการเช่าเหมาลำเรือและเรือยอชต์",
      zh: "游艇 / 船只包租",
    },
    description: {
      en: "Private yacht and boat charter experiences designed for flexible and memorable journeys across Thailand.",
      th: "สัมผัสประสบการณ์ล่องเรือส่วนตัวที่ยืดหยุ่นและสะดวกสบาย เพื่อสำรวจทะเลไทยในแบบของคุณ",
      zh: "提供私人游艇及船只包租服务，以更加灵活、舒适的方式探索泰国海域。",
    },
    features_en: [
      "Motor Yacht",
      "Sailing Yacht",
      "Super Yacht",
      "Power Catamaran",
    ],
    features_th: [
      "เรือยอชต์เครื่องยนต์",
      "เรือใบยอชต์",
      "เรือยอชต์หรู",
      "เรือคาตามารัน",
    ],
    features_zh: ["摩托游艇", "帆船", "豪华游艇", "双体船"],
    image_url: "",
  },
  service_03: {
    number: "03",
    tag: {
      en: "WORKSHOP & EXPERIENCES",
      th: "เวิร์กช็อปและกิจกรรมประสบการณ์",
      zh: "工作坊与体验活动",
    },
    title: {
      en: "Workshop",
      th: "เวิร์กช็อป",
      zh: "工作坊",
    },
    description: {
      en: "Discover workshops, cultural activities and meaningful local experiences across Thailand.",
      th: "ค้นพบเวิร์กช็อป กิจกรรมทางวัฒนธรรม และประสบการณ์ท้องถิ่นที่มีความหมายทั่วประเทศไทย",
      zh: "探索泰国各地的工作坊、文化活动及特色体验。",
    },
    features_en: [
      "Cultural Experiences",
      "Community Activities",
      "Creative Workshops",
    ],
    features_th: [
      "ประสบการณ์วัฒนธรรม",
      "กิจกรรมชุมชน",
      "เวิร์กช็อปสร้างสรรค์",
    ],
    features_zh: ["文化体验", "社区活动", "创意工作坊"],
    image_url: "",
  },
  mice: {
    eyebrow: {
      en: "MICE",
      th: "การประชุมและการท่องเที่ยวเพื่อเป็นรางวัล",
      zh: "会议与奖励旅游",
    },
    title: {
      en: "Meeting & Incentive",
      th: "การประชุมและการท่องเที่ยวเพื่อเป็นรางวัล",
      zh: "会议与奖励旅游",
    },
    description_1: {
      en: "Experience eco-luxury with Silver Hawk Group through sustainable, impactful and community-driven meeting and incentive experiences in Thailand.",
      th: "สัมผัสบริการระดับพรีเมียมที่ผสานความยั่งยืนและชุมชน ผ่านการประชุมและการเดินทางเพื่อสร้างแรงจูงใจในประเทศไทย",
      zh: "通过可持续、有影响力并以社区为导向的会议与奖励旅游体验，探索 Silver Hawk Group 的生态奢华服务。",
    },
    description_2: {
      en: "We create Meetings, Incentives, Conferences and Events that integrate luxury, sustainability and local community experiences.",
      th: "เราออกแบบการประชุม การเดินทางเพื่อเป็นรางวัล การประชุมสัมมนา และกิจกรรมต่าง ๆ โดยผสานความหรูหรา ความยั่งยืน และประสบการณ์จากชุมชนท้องถิ่น",
      zh: "我们创造的会议、奖励旅游、会议和活动，融合了奢华、可持续性和当地社区体验。",
    },
    image_url: "/images/mice/meeting-incentive.jpg",
  },
  corporate_training: {
    eyebrow: {
      en: "CORPORATE TRAINING",
      th: "การฝึกอบรมองค์กร",
      zh: "企业培训",
    },
    title: {
      en: "Corporate Training & Human Resource Development",
      th: "การฝึกอบรมองค์กรและการพัฒนาทรัพยากรบุคคล",
      zh: "企业培训与人力资源开发",
    },
    description_1: {
      en: "Silver Hawk Group provides made-to-order corporate training programs tailored to the hospitality, travel, and customer service industries.",
      th: "Silver Hawk Group จัดหลักสูตรฝึกอบรมองค์กรที่ออกแบบเฉพาะสำหรับธุรกิจโรงแรม การท่องเที่ยว และงานบริการลูกค้า",
      zh: "Silver Hawk Group 提供量身定制的企业培训课程，专为酒店、旅游及客户服务行业而设计。",
    },
    description_2: {
      en: "Our programs focus on customer experience, sustainability, responsible service and carbon-neutral operations.",
      th: "หลักสูตรของเราเน้นประสบการณ์ลูกค้า ความยั่งยืน การบริการอย่างรับผิดชอบ และการดำเนินงานที่มุ่งสู่ความเป็นกลางทางคาร์บอน",
      zh: "我们的项目专注于客户体验、可持续发展、负责任的服务和碳中和运营。",
    },
    image_url: "/images/corporate-training.jpg",
  },
  why_choose_us: {
    title: {
      en: "Why Choose Us?",
      th: "ทำไมต้องเลือกเรา",
      zh: "为什么选择我们？",
    },
    features: [
      {
        title: {
          en: "Regenerative Travel",
          th: "การท่องเที่ยวเชิงฟื้นฟู",
          zh: "永续再生旅行",
        },
        description: {
          en: "Positive impact for local marine ecosystems and island communities.",
          th: "สร้างผลลัพธ์เชิงบวกต่อระบบนิเวศทางทะเลและชุมชนเกาะท้องถิ่น",
          zh: "为当地海洋生态系统与海岛社区创造积极深远的影响。",
        },
      },
      {
        title: {
          en: "Expert Local Guides",
          th: "มัคคุเทศก์ท้องถิ่นผู้เชี่ยวชาญ",
          zh: "资深本地向导",
        },
        description: {
          en: "Passionate, licensed bilingual storytellers sharing authentic culture.",
          th: "ผู้เล่าเรื่องสองภาษาที่ได้รับใบอนุญาต ถ่ายทอดวัฒนธรรมแท้จริงด้วยหัวใจ",
          zh: "持牌资深双语向导，带您沉浸式领略最真实的在地文化与风景。",
        },
      },
      {
        title: {
          en: "Bespoke & Seamless",
          th: "ออกแบบเฉพาะและไร้รอยต่อ",
          zh: "专属定制，全程无忧",
        },
        description: {
          en: "VIP concierge, transparent all-inclusive pricing, and flexible care.",
          th: "บริการผู้ช่วยส่วนตัว ราคาโปร่งใสรวมทุกอย่าง และการดูแลที่ยืดหยุ่น",
          zh: "全方位VIP管家服务，透明全包无隐形消费，行程灵活随心。",
        },
      },
      {
        title: {
          en: "Certified Safety & 24/7 Care",
          th: "มาตรฐานความปลอดภัยและการดูแล 24 ชม.",
          zh: "全方位安全保障与24小时专属服务",
        },
        description: {
          en: "Comprehensive accident insurance, certified marine equipment, and round-the-clock guest support.",
          th: "ประกันภัยอุบัติเหตุครอบคลุม อุปกรณ์มาตรฐานสากล และทีมงานพร้อมดูแลเคียงข้างตลอด 24 ชั่วโมง",
          zh: "全额旅游意外险覆盖、严选国际标准装备与全天候专属管家贴心守护。",
        },
        icon: "shield",
      },
    ],
  },
  about: {
    title: {
      en: "About Silver Hawk Group",
      th: "เกี่ยวกับ ซิลเวอร์ ฮอว์ก กรุ๊ป",
      zh: "关于 Silver Hawk Group",
    },
    description: {
      en: "SILVER HAWK GROUP is dedicated to providing high-quality travel experiences throughout Thailand.",
      th: "SILVER HAWK GROUP มุ่งมั่นสร้างประสบการณ์การเดินทางคุณภาพสูงทั่วประเทศไทย",
      zh: "SILVER HAWK GROUP 致力于为客户提供高品质的泰国旅游体验。",
    },
  },
  last_updated: "2026-10-26",
};

function mergeMultilingual(
  fallback: MultilingualContent,
  curr?: Partial<MultilingualContent> | null,
  upd?: Partial<MultilingualContent> | null
): MultilingualContent {
  return {
    en: upd?.en ?? curr?.en ?? fallback.en,
    th: upd?.th ?? curr?.th ?? fallback.th,
    zh: upd?.zh ?? curr?.zh ?? fallback.zh,
  };
}

function mergeHeader(
  fallback: { eyebrow: MultilingualContent; title: MultilingualContent; subtitle: MultilingualContent },
  curr?: Record<string, unknown>,
  upd?: Record<string, unknown>
) {
  return {
    eyebrow: mergeMultilingual(fallback.eyebrow, curr?.eyebrow as Partial<MultilingualContent>, upd?.eyebrow as Partial<MultilingualContent>),
    title: mergeMultilingual(fallback.title, curr?.title as Partial<MultilingualContent>, upd?.title as Partial<MultilingualContent>),
    subtitle: mergeMultilingual(fallback.subtitle, curr?.subtitle as Partial<MultilingualContent>, upd?.subtitle as Partial<MultilingualContent>),
  };
}

function mergeServiceCard(
  fallback: ServiceCardContent,
  curr?: Record<string, unknown>,
  upd?: Record<string, unknown>
): ServiceCardContent {
  return {
    number: (typeof upd?.number === "string" ? upd.number : typeof curr?.number === "string" ? curr.number : fallback.number),
    tag: mergeMultilingual(fallback.tag, curr?.tag as Partial<MultilingualContent>, upd?.tag as Partial<MultilingualContent>),
    title: mergeMultilingual(fallback.title, curr?.title as Partial<MultilingualContent>, upd?.title as Partial<MultilingualContent>),
    description: mergeMultilingual(fallback.description, curr?.description as Partial<MultilingualContent>, upd?.description as Partial<MultilingualContent>),
    features_en: (Array.isArray(upd?.features_en) ? upd.features_en : Array.isArray(curr?.features_en) ? curr.features_en : fallback.features_en) as string[],
    features_th: (Array.isArray(upd?.features_th) ? upd.features_th : Array.isArray(curr?.features_th) ? curr.features_th : fallback.features_th) as string[],
    features_zh: (Array.isArray(upd?.features_zh) ? upd.features_zh : Array.isArray(curr?.features_zh) ? curr.features_zh : fallback.features_zh) as string[],
    image_url: (typeof upd?.image_url === "string" ? upd.image_url : typeof curr?.image_url === "string" ? curr.image_url : fallback.image_url),
  };
}

function mergeMediaSection(
  fallback: MediaSectionContent,
  curr?: Record<string, unknown>,
  upd?: Record<string, unknown>
): MediaSectionContent {
  return {
    eyebrow: mergeMultilingual(fallback.eyebrow, curr?.eyebrow as Partial<MultilingualContent>, upd?.eyebrow as Partial<MultilingualContent>),
    title: mergeMultilingual(fallback.title, curr?.title as Partial<MultilingualContent>, upd?.title as Partial<MultilingualContent>),
    description_1: mergeMultilingual(fallback.description_1, curr?.description_1 as Partial<MultilingualContent>, upd?.description_1 as Partial<MultilingualContent>),
    description_2: mergeMultilingual(fallback.description_2, curr?.description_2 as Partial<MultilingualContent>, upd?.description_2 as Partial<MultilingualContent>),
    image_url: (typeof upd?.image_url === "string" ? upd.image_url : typeof curr?.image_url === "string" ? curr.image_url : fallback.image_url) as string,
  };
}

export async function getHomepageContent(): Promise<HomepageContent> {
  try {
    const parsed = (await readJsonStorage<Record<string, unknown>>(
      "homepage_content.json",
      DEFAULT_HOMEPAGE_CONTENT as unknown as Record<string, unknown>,
      "homepage_content"
    )) as Partial<HomepageContent>;
    if (!parsed) {
      return DEFAULT_HOMEPAGE_CONTENT;
    }
    return {
      ...DEFAULT_HOMEPAGE_CONTENT,
      ...parsed,
      hero: {
        eyebrow: parsed.hero?.eyebrow ?? DEFAULT_HOMEPAGE_CONTENT.hero.eyebrow,
        bg_image_url: parsed.hero?.bg_image_url ?? DEFAULT_HOMEPAGE_CONTENT.hero.bg_image_url,
        title: mergeMultilingual(DEFAULT_HOMEPAGE_CONTENT.hero.title, parsed.hero?.title),
        subtitle: mergeMultilingual(DEFAULT_HOMEPAGE_CONTENT.hero.subtitle, parsed.hero?.subtitle),
      },
      themes_header: mergeHeader(DEFAULT_HOMEPAGE_CONTENT.themes_header, parsed.themes_header),
      tours_header: mergeHeader(DEFAULT_HOMEPAGE_CONTENT.tours_header, parsed.tours_header),
      services_header: mergeHeader(DEFAULT_HOMEPAGE_CONTENT.services_header, parsed.services_header),
      service_01: mergeServiceCard(DEFAULT_HOMEPAGE_CONTENT.service_01, parsed.service_01),
      service_02: mergeServiceCard(DEFAULT_HOMEPAGE_CONTENT.service_02, parsed.service_02),
      service_03: mergeServiceCard(DEFAULT_HOMEPAGE_CONTENT.service_03, parsed.service_03),
      mice: mergeMediaSection(DEFAULT_HOMEPAGE_CONTENT.mice, parsed.mice),
      corporate_training: mergeMediaSection(DEFAULT_HOMEPAGE_CONTENT.corporate_training, parsed.corporate_training),
      why_choose_us: {
        title: mergeMultilingual(DEFAULT_HOMEPAGE_CONTENT.why_choose_us.title, parsed.why_choose_us?.title),
        features: Array.isArray(parsed.why_choose_us?.features)
          ? parsed.why_choose_us.features.map((feat: unknown, idx: number) => {
              const f = (feat && typeof feat === "object" ? feat : {}) as {
                title?: Partial<MultilingualContent>;
                description?: Partial<MultilingualContent>;
                icon?: string;
              };
              const defFeat = DEFAULT_HOMEPAGE_CONTENT.why_choose_us.features[idx];
              return {
                title: {
                  en: f.title?.en ?? defFeat?.title?.en ?? "",
                  th: f.title?.th ?? defFeat?.title?.th ?? "",
                  zh: f.title?.zh ?? defFeat?.title?.zh ?? "",
                },
                description: {
                  en: f.description?.en ?? defFeat?.description?.en ?? "",
                  th: f.description?.th ?? defFeat?.description?.th ?? "",
                  zh: f.description?.zh ?? defFeat?.description?.zh ?? "",
                },
                icon: f.icon ?? defFeat?.icon ?? "shield",
              };
            })
          : DEFAULT_HOMEPAGE_CONTENT.why_choose_us.features,
      },
      about: {
        title: mergeMultilingual(
          DEFAULT_HOMEPAGE_CONTENT.about?.title || { en: "About Silver Hawk Group", th: "เกี่ยวกับ ซิลเวอร์ ฮอว์ก กรุ๊ป", zh: "关于 Silver Hawk Group" },
          parsed.about?.title
        ),
        description: mergeMultilingual(
          DEFAULT_HOMEPAGE_CONTENT.about?.description || { en: "SILVER HAWK GROUP is dedicated to providing high-quality travel experiences throughout Thailand.", th: "SILVER HAWK GROUP มุ่งมั่นสร้างประสบการณ์การเดินทางคุณภาพสูงทั่วประเทศไทย", zh: "SILVER HAWK GROUP 致力于为客户提供高品质的泰国旅游体验。" },
          parsed.about?.description
        ),
      },
      last_updated: parsed.last_updated || DEFAULT_HOMEPAGE_CONTENT.last_updated,
    };
  } catch (err) {
    console.error("Failed to read homepage content, using defaults:", err);
    return DEFAULT_HOMEPAGE_CONTENT;
  }
}

export async function saveHomepageContent(
  updates: Partial<HomepageContent>
): Promise<HomepageContent> {
  const current = await getHomepageContent();
  const next: HomepageContent = {
    hero: {
      eyebrow: updates.hero?.eyebrow ?? current.hero.eyebrow,
      bg_image_url: updates.hero?.bg_image_url !== undefined ? updates.hero.bg_image_url : current.hero.bg_image_url,
      title: mergeMultilingual(DEFAULT_HOMEPAGE_CONTENT.hero.title, current.hero.title, updates.hero?.title),
      subtitle: mergeMultilingual(DEFAULT_HOMEPAGE_CONTENT.hero.subtitle, current.hero.subtitle, updates.hero?.subtitle),
    },
    themes_header: mergeHeader(DEFAULT_HOMEPAGE_CONTENT.themes_header, current.themes_header, updates.themes_header),
    tours_header: mergeHeader(DEFAULT_HOMEPAGE_CONTENT.tours_header, current.tours_header, updates.tours_header),
    services_header: mergeHeader(DEFAULT_HOMEPAGE_CONTENT.services_header, current.services_header, updates.services_header),
    service_01: mergeServiceCard(DEFAULT_HOMEPAGE_CONTENT.service_01, current.service_01, updates.service_01),
    service_02: mergeServiceCard(DEFAULT_HOMEPAGE_CONTENT.service_02, current.service_02, updates.service_02),
    service_03: mergeServiceCard(DEFAULT_HOMEPAGE_CONTENT.service_03, current.service_03, updates.service_03),
    mice: mergeMediaSection(DEFAULT_HOMEPAGE_CONTENT.mice, current.mice, updates.mice),
    corporate_training: mergeMediaSection(DEFAULT_HOMEPAGE_CONTENT.corporate_training, current.corporate_training, updates.corporate_training),
    why_choose_us: {
      title: mergeMultilingual(DEFAULT_HOMEPAGE_CONTENT.why_choose_us.title, current.why_choose_us.title, updates.why_choose_us?.title),
      features: Array.isArray(updates.why_choose_us?.features)
        ? updates.why_choose_us.features.map((feat: unknown, idx: number) => {
            const f = (feat && typeof feat === "object" ? feat : {}) as {
              title?: Partial<MultilingualContent>;
              description?: Partial<MultilingualContent>;
              icon?: string;
            };
            const curFeat = current.why_choose_us.features[idx] || DEFAULT_HOMEPAGE_CONTENT.why_choose_us.features[idx] || DEFAULT_HOMEPAGE_CONTENT.why_choose_us.features[0];
            return {
              title: {
                en: f.title?.en ?? curFeat?.title?.en ?? "",
                th: f.title?.th ?? curFeat?.title?.th ?? "",
                zh: f.title?.zh ?? curFeat?.title?.zh ?? "",
              },
              description: {
                en: f.description?.en ?? curFeat?.description?.en ?? "",
                th: f.description?.th ?? curFeat?.description?.th ?? "",
                zh: f.description?.zh ?? curFeat?.description?.zh ?? "",
              },
              icon: f.icon ?? curFeat?.icon ?? "shield",
            };
          })
        : current.why_choose_us.features,
    },
    about: {
      title: mergeMultilingual(
        DEFAULT_HOMEPAGE_CONTENT.about?.title || { en: "About Silver Hawk Group", th: "เกี่ยวกับ ซิลเวอร์ ฮอว์ก กรุ๊ป", zh: "关于 Silver Hawk Group" },
        current.about?.title,
        updates.about?.title
      ),
      description: mergeMultilingual(
        DEFAULT_HOMEPAGE_CONTENT.about?.description || { en: "SILVER HAWK GROUP is dedicated to providing high-quality travel experiences throughout Thailand.", th: "SILVER HAWK GROUP มุ่งมั่นสร้างประสบการณ์การเดินทางคุณภาพสูงทั่วประเทศไทย", zh: "SILVER HAWK GROUP 致力于为客户提供高品质的泰国旅游体验。" },
        current.about?.description,
        updates.about?.description
      ),
    },
    last_updated: new Date().toISOString().split("T")[0],
  };

  await writeJsonStorage("homepage_content.json", next, "homepage_content");
  return next;
}
