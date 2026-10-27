import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type PartnerCompanyItem = {
  id: string;
  name: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  created_at?: string;
};

export const DEFAULT_PARTNER_COMPANIES: PartnerCompanyItem[] = [
  {
    id: "pc-1",
    name: "Carnival Magic",
    contact_person: "Reservation Dept",
    contact_phone: "+66 76 385 555",
    contact_email: "reservation@carnivalmagic.fun",
    notes: "Theme park & cultural carnival tickets",
  },
  {
    id: "pc-2",
    name: "Phuket FantaSea",
    contact_person: "Reservation Team",
    contact_phone: "+66 76 385 000",
    contact_email: "info@phuketfantasea.fun",
    notes: "Show and buffet dinner reservations",
  },
  {
    id: "pc-3",
    name: "Siam Niramit Phuket",
    contact_person: "Ticket Office",
    contact_phone: "+66 76 335 000",
    contact_email: "booking@siamniramitphuket.com",
    notes: "World-class cultural stage show",
  },
  {
    id: "pc-4",
    name: "Andamanda Phuket",
    contact_person: "Guest Services",
    contact_phone: "+66 76 646 777",
    contact_email: "info@andamandaphuket.com",
    notes: "Water park admission passes",
  },
  {
    id: "pc-5",
    name: "Blue Tree Phuket",
    contact_person: "Operations",
    contact_phone: "+66 76 602 444",
    contact_email: "info@bluetree.fun",
    notes: "Lagoon water park & entertainment hub",
  },
  {
    id: "pc-6",
    name: "Hanuman World Phuket",
    contact_person: "Booking Agent",
    contact_phone: "+66 62 979 5533",
    contact_email: "play@hanumanworldphuket.com",
    notes: "Zipline & jungle adventures",
  },
  {
    id: "pc-7",
    name: "Tiger Kingdom Phuket",
    contact_person: "Ticket Counter",
    contact_phone: "+66 76 323 311",
    contact_email: "info@tigerkingdom.com",
    notes: "Tiger encounter passes",
  },
  {
    id: "pc-8",
    name: "Simon Cabaret Phuket",
    contact_person: "Box Office",
    contact_phone: "+66 76 342 011",
    contact_email: "phuketsimoncabaret@gmail.com",
    notes: "Cabaret show ticketing",
  },
  {
    id: "pc-9",
    name: "Dolphin Bay Phuket",
    contact_person: "Ticketing",
    contact_phone: "+66 76 374 300",
    contact_email: "info@dolphinsbay-phuket.com",
    notes: "Dolphin marine show tickets",
  },
];

function normalizeRaw(rawList: unknown): PartnerCompanyItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_PARTNER_COMPANIES;
  }

  const items: PartnerCompanyItem[] = [];
  rawList.forEach((item, idx) => {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) return;
      items.push({
        id: `pc-${idx + 1}-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        name: trimmed,
      });
    } else if (item && typeof item === "object") {
      const obj = item as any;
      const name = String(obj.name || "").trim();
      if (!name) return;
      items.push({
        id: String(obj.id || `pc-${idx + 1}-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`),
        name,
        contact_person: obj.contact_person ? String(obj.contact_person).trim() : undefined,
        contact_phone: obj.contact_phone ? String(obj.contact_phone).trim() : undefined,
        contact_email: obj.contact_email ? String(obj.contact_email).trim() : undefined,
        notes: obj.notes ? String(obj.notes).trim() : undefined,
        created_at: obj.created_at || new Date().toISOString(),
      });
    }
  });

  return items.length > 0 ? items : DEFAULT_PARTNER_COMPANIES;
}

export async function getPartnerCompanyList(): Promise<PartnerCompanyItem[]> {
  try {
    const raw = await readJsonStorage<unknown>(
      "partner_companies.json",
      DEFAULT_PARTNER_COMPANIES,
      "partner_companies"
    );
    return normalizeRaw(raw);
  } catch {
    return DEFAULT_PARTNER_COMPANIES;
  }
}

export async function getPartnerCompanies(): Promise<string[]> {
  const list = await getPartnerCompanyList();
  return list.map((c) => c.name);
}

export async function savePartnerCompanyList(
  list: PartnerCompanyItem[]
): Promise<PartnerCompanyItem[]> {
  const uniqueMap = new Map<string, PartnerCompanyItem>();
  for (const item of list) {
    const name = item.name.trim();
    if (name) {
      uniqueMap.set(name.toLowerCase(), {
        ...item,
        name,
        id: item.id || `pc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      });
    }
  }

  const normalized = Array.from(uniqueMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  await writeJsonStorage("partner_companies.json", normalized, "partner_companies");
  return normalized;
}

export async function savePartnerCompanies(companies: string[]): Promise<string[]> {
  const currentList = await getPartnerCompanyList();
  const currentMap = new Map(currentList.map((c) => [c.name.toLowerCase(), c]));

  const updatedItems: PartnerCompanyItem[] = companies
    .map((c) => c.trim())
    .filter(Boolean)
    .map((name) => {
      const existing = currentMap.get(name.toLowerCase());
      if (existing) return existing;
      return {
        id: `pc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
      };
    });

  const saved = await savePartnerCompanyList(updatedItems);
  return saved.map((s) => s.name);
}

export async function addPartnerCompany(
  newCompany:
    | string
    | {
        name: string;
        contact_person?: string;
        contact_phone?: string;
        contact_email?: string;
        notes?: string;
      }
): Promise<PartnerCompanyItem[]> {
  const current = await getPartnerCompanyList();
  const name =
    typeof newCompany === "string" ? newCompany.trim() : newCompany?.name?.trim();

  if (!name) return current;

  const existingIdx = current.findIndex(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );

  const itemData: PartnerCompanyItem =
    typeof newCompany === "string"
      ? {
          id: `pc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name,
          created_at: new Date().toISOString(),
        }
      : {
          id: `pc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name,
          contact_person: newCompany.contact_person?.trim(),
          contact_phone: newCompany.contact_phone?.trim(),
          contact_email: newCompany.contact_email?.trim(),
          notes: newCompany.notes?.trim(),
          created_at: new Date().toISOString(),
        };

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      ...itemData,
      id: current[existingIdx].id,
    };
  } else {
    current.push(itemData);
  }

  return await savePartnerCompanyList(current);
}

export async function deletePartnerCompany(idOrName: string): Promise<PartnerCompanyItem[]> {
  const target = idOrName.trim().toLowerCase();
  if (!target) return await getPartnerCompanyList();

  const current = await getPartnerCompanyList();
  const filtered = current.filter(
    (c) => c.id.toLowerCase() !== target && c.name.toLowerCase() !== target
  );

  return await savePartnerCompanyList(filtered);
}
