import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonStorage, writeJsonStorage } from "@/lib/serverless-store";

export type TourPickupLocation = {
  id: number;
  tour_id: number;
  location_name: string;
  adult_price: number;
  child_price: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
};

export type TourTransferSettings = {
  enable_transfer: boolean;
  enable_meeting_point?: boolean;
  meeting_point: string;
  meeting_time: string;
  additional_notes: string;
};

export type TourPickupData = TourTransferSettings & {
  pickup_locations: TourPickupLocation[];
  is_fallback?: boolean;
};


function getDefaultLocations(tourId: number): TourPickupLocation[] {
  return [
    {
      id: 1001,
      tour_id: tourId,
      location_name: "Ao Nang",
      adult_price: 1500,
      child_price: 1100,
      notes: "-",
      is_active: true,
      sort_order: 1,
    },
    {
      id: 1002,
      tour_id: tourId,
      location_name: "Krabi Town",
      adult_price: 1700,
      child_price: 1250,
      notes: "-",
      is_active: true,
      sort_order: 2,
    },
    {
      id: 1003,
      tour_id: tourId,
      location_name: "Klong Muang",
      adult_price: 1900,
      child_price: 1400,
      notes: "-",
      is_active: false,
      sort_order: 3,
    },
  ];
}

const DEFAULT_SETTINGS: TourTransferSettings = {
  enable_transfer: true,
  enable_meeting_point: true,
  meeting_point: "Ao Nang Pier",
  meeting_time: "08:00",
  additional_notes: "Please arrive at least 15 minutes before departure time.",
};

async function readLocalStore(): Promise<Record<string, TourPickupData>> {
  try {
    return await readJsonStorage<Record<string, TourPickupData>>(
      "tour_pickups.json",
      {},
      "tour_pickups"
    );
  } catch {
    return {};
  }
}

async function writeLocalStore(data: Record<string, TourPickupData>): Promise<void> {
  try {
    await writeJsonStorage("tour_pickups.json", data, "tour_pickups");
  } catch (error) {
    console.error("Failed to write tour pickup local store:", error);
  }
}

export async function getTourPickupData(tourId: number): Promise<TourPickupData> {
  const adminClient = createAdminClient();

  let supabaseLocations: TourPickupLocation[] | null = null;
  let supabaseSettings: Partial<TourTransferSettings> | null = null;
  let hasSupabaseError = false;

  try {
    // 1. Try to read settings from tours table
    const { data: tourData, error: tourError } = await adminClient
      .from("tours")
      .select("enable_transfer, meeting_point, meeting_time, additional_notes")
      .eq("id", tourId)
      .maybeSingle();

    if (!tourError && tourData) {
      supabaseSettings = {
        enable_transfer: tourData.enable_transfer ?? true,
        enable_meeting_point: (tourData as any)?.enable_meeting_point !== undefined ? Boolean((tourData as any).enable_meeting_point) : undefined,
        meeting_point: tourData.meeting_point ?? DEFAULT_SETTINGS.meeting_point,
        meeting_time: tourData.meeting_time ?? DEFAULT_SETTINGS.meeting_time,
        additional_notes: tourData.additional_notes ?? DEFAULT_SETTINGS.additional_notes,
      };
    }

    // 2. Try to read pickup locations from tour_pickup_locations table
    const { data: locData, error: locError } = await adminClient
      .from("tour_pickup_locations")
      .select("*")
      .eq("tour_id", tourId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (locError) {
      hasSupabaseError = true;
    } else if (locData) {
      supabaseLocations = locData.map((item) => ({
        id: Number(item.id),
        tour_id: Number(item.tour_id),
        location_name: String(item.location_name || ""),
        adult_price: Number(item.adult_price || 0),
        child_price: Number(item.child_price || 0),
        notes: item.notes ?? "-",
        is_active: Boolean(item.is_active),
        sort_order: Number(item.sort_order || 0),
        created_at: item.created_at,
      }));
    }
  } catch {
    hasSupabaseError = true;
  }

  // If Supabase table exists and returned records
  if (!hasSupabaseError && supabaseLocations && supabaseLocations.length > 0) {
    const localStore = await readLocalStore();
    const cached = localStore[String(tourId)];
    return {
      enable_transfer: supabaseSettings?.enable_transfer ?? true,
      enable_meeting_point:
        supabaseSettings?.enable_meeting_point !== undefined
          ? supabaseSettings.enable_meeting_point
          : cached?.enable_meeting_point !== undefined
          ? cached.enable_meeting_point
          : true,
      meeting_point: supabaseSettings?.meeting_point || DEFAULT_SETTINGS.meeting_point,
      meeting_time: supabaseSettings?.meeting_time || DEFAULT_SETTINGS.meeting_time,
      additional_notes: supabaseSettings?.additional_notes || DEFAULT_SETTINGS.additional_notes,
      pickup_locations: supabaseLocations,
      is_fallback: false,
    };
  }

  // Fallback to local store or defaults
  const localStore = await readLocalStore();
  const cached = localStore[String(tourId)];

  if (cached) {
    return {
      ...cached,
      enable_meeting_point: cached.enable_meeting_point !== undefined ? cached.enable_meeting_point : true,
      is_fallback: true,
    };
  }

  // Default seed
  const defaultData: TourPickupData = {
    ...DEFAULT_SETTINGS,
    pickup_locations: getDefaultLocations(tourId),
    is_fallback: true,
  };

  localStore[String(tourId)] = defaultData;
  await writeLocalStore(localStore);

  return defaultData;
}

export async function saveTourPickupData(
  tourId: number,
  data: {
    enable_transfer?: boolean;
    enable_meeting_point?: boolean;
    meeting_point?: string;
    meeting_time?: string;
    additional_notes?: string;
    pickup_locations?: Array<{
      id?: number;
      tour_id?: number;
      location_name: string;
      adult_price: number;
      child_price: number;
      notes?: string | null;
      is_active: boolean;
      sort_order?: number;
    }>;
  }
): Promise<TourPickupData> {
  const adminClient = createAdminClient();
  const localStore = await readLocalStore();
  const current = (await getTourPickupData(tourId)) || {
    ...DEFAULT_SETTINGS,
    pickup_locations: getDefaultLocations(tourId),
  };

  const updatedSettings: TourTransferSettings = {
    enable_transfer: data.enable_transfer !== undefined ? data.enable_transfer : current.enable_transfer,
    enable_meeting_point: data.enable_meeting_point !== undefined ? data.enable_meeting_point : (current.enable_meeting_point ?? true),
    meeting_point: data.meeting_point !== undefined ? data.meeting_point : current.meeting_point,
    meeting_time: data.meeting_time !== undefined ? data.meeting_time : current.meeting_time,
    additional_notes: data.additional_notes !== undefined ? data.additional_notes : current.additional_notes,
  };

  let updatedLocations: TourPickupLocation[] = current.pickup_locations;

  // 1. Attempt to update Supabase tours table
  try {
    const updatePayload: Record<string, any> = {
      enable_transfer: updatedSettings.enable_transfer,
      meeting_point: updatedSettings.meeting_point,
      meeting_time: updatedSettings.meeting_time,
      additional_notes: updatedSettings.additional_notes,
    };
    if (updatedSettings.enable_meeting_point !== undefined) {
      updatePayload.enable_meeting_point = updatedSettings.enable_meeting_point;
    }
    await adminClient
      .from("tours")
      .update(updatePayload)
      .eq("id", tourId);
  } catch (err) {
    console.warn("Could not update transfer columns on tours table:", err);
  }

  // 2. If pickup_locations are provided, attempt to update Supabase tour_pickup_locations
  if (data.pickup_locations && Array.isArray(data.pickup_locations)) {
    try {
      // First delete existing pickup locations for this tour
      await adminClient
        .from("tour_pickup_locations")
        .delete()
        .eq("tour_id", tourId);

      // Insert new rows
      const rowsToInsert = data.pickup_locations.map((loc, idx) => ({
        tour_id: tourId,
        location_name: loc.location_name.trim(),
        adult_price: Number(loc.adult_price || 0),
        child_price: Number(loc.child_price || 0),
        notes: loc.notes?.trim() || "-",
        is_active: loc.is_active,
        sort_order: loc.sort_order ?? idx + 1,
      }));

      const { data: inserted, error: insertError } = await adminClient
        .from("tour_pickup_locations")
        .insert(rowsToInsert)
        .select("*")
        .order("sort_order", { ascending: true });

      if (!insertError && inserted && inserted.length > 0) {
        updatedLocations = inserted.map((row) => ({
          id: Number(row.id),
          tour_id: Number(row.tour_id),
          location_name: row.location_name,
          adult_price: Number(row.adult_price),
          child_price: Number(row.child_price),
          notes: row.notes,
          is_active: Boolean(row.is_active),
          sort_order: Number(row.sort_order),
          created_at: row.created_at,
        }));
      } else {
        // Fallback for local state
        updatedLocations = data.pickup_locations.map((loc, idx) => ({
          id: loc.id && loc.id < 10000 ? loc.id : Date.now() + idx,
          tour_id: tourId,
          location_name: loc.location_name.trim(),
          adult_price: Number(loc.adult_price || 0),
          child_price: Number(loc.child_price || 0),
          notes: loc.notes?.trim() || "-",
          is_active: loc.is_active,
          sort_order: loc.sort_order ?? idx + 1,
        }));
      }
    } catch {
      updatedLocations = data.pickup_locations.map((loc, idx) => ({
        id: loc.id && loc.id < 10000 ? loc.id : Date.now() + idx,
        tour_id: tourId,
        location_name: loc.location_name.trim(),
        adult_price: Number(loc.adult_price || 0),
        child_price: Number(loc.child_price || 0),
        notes: loc.notes?.trim() || "-",
        is_active: loc.is_active,
        sort_order: loc.sort_order ?? idx + 1,
      }));
    }
  }

  const result: TourPickupData = {
    ...updatedSettings,
    pickup_locations: updatedLocations,
  };

  // Always sync to local store
  localStore[String(tourId)] = result;
  await writeLocalStore(localStore);

  return result;
}

