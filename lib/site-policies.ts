import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";
import {
  SitePolicies,
  DEFAULT_SITE_POLICIES,
  DEFAULT_TOUR_TYPE_PDPA,
  DEFAULT_TOUR_TYPE_CANCELLATION,
} from "./site-policies-base";

export * from "./site-policies-base";

export async function getSitePolicies(): Promise<SitePolicies> {
  try {
    const parsed = await readJsonStorage<any>(
      "site_policies.json",
      DEFAULT_SITE_POLICIES,
      "site_policies"
    );
    return {
      pdpa: {
        ...DEFAULT_SITE_POLICIES.pdpa,
        ...(parsed?.pdpa || {}),
        by_tour_type: {
          ...DEFAULT_TOUR_TYPE_PDPA,
          ...(parsed?.pdpa?.by_tour_type || {}),
        },
      },
      cancellation: {
        ...DEFAULT_SITE_POLICIES.cancellation,
        ...(parsed?.cancellation || {}),
        by_tour_type: {
          ...DEFAULT_TOUR_TYPE_CANCELLATION,
          ...(parsed?.cancellation?.by_tour_type || {}),
        },
      },
    };
  } catch (err) {
    console.error("Failed to read site policies, using defaults:", err);
    return DEFAULT_SITE_POLICIES;
  }
}

export async function saveSitePolicies(
  updates: Partial<SitePolicies>
): Promise<SitePolicies> {
  const current = await getSitePolicies();
  const next: SitePolicies = {
    pdpa: {
      ...current.pdpa,
      ...(updates.pdpa || {}),
      by_tour_type: {
        ...(current.pdpa.by_tour_type || DEFAULT_TOUR_TYPE_PDPA),
        ...(updates.pdpa?.by_tour_type || {}),
      },
      last_updated: new Date().toISOString().split("T")[0],
    },
    cancellation: {
      ...current.cancellation,
      ...(updates.cancellation || {}),
      by_tour_type: {
        ...(current.cancellation.by_tour_type || DEFAULT_TOUR_TYPE_CANCELLATION),
        ...(updates.cancellation?.by_tour_type || {}),
      },
    },
  };

  await writeJsonStorage("site_policies.json", next, "site_policies");
  return next;
}
