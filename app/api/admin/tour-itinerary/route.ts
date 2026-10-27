
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ItineraryBody = {
  id?: number;
  tour_id?: number;
  time?: string | null;
  activity_en?: string | null;
  activity_zh?: string | null;
  activity_th?: string | null;
  sort_order?: number | null;
  image_url?: string | null;
};

const BUCKET = "tour-itinerary-images";
const SIGNED_URL_TTL = 60 * 60;

async function getAdminClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      ),
    };
  }

  const adminClient = createAdminClient();

  const { data: admin, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Admin lookup failed:", adminError.message);

    return {
      supabase,
      response: NextResponse.json(
        { error: "Unable to verify admin access." },
        { status: 500 }
      ),
    };
  }

  if (!admin) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { supabase: adminClient, response: null };
}

function isPositiveId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}


function normalizeImagePath(
  value: unknown,
  tourId: number
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const path = value.trim();

  // Accept only an image path belonging to this tour.
  const allowedPath = new RegExp(
    `^tour-${tourId}/[a-zA-Z0-9-]+\\.(jpg|jpeg|png|webp)$`,
    "i"
  );

  if (
    !path ||
    path.startsWith("/") ||
    path.includes("..") ||
    path.includes("\\") ||
    /^https?:\/\//i.test(path) ||
    !allowedPath.test(path)
  ) {
    return undefined;
  }

  return path;
}

async function attachSignedUrls<
  T extends { image_url?: string | null }
>(items: T[]) {
  const adminClient = createAdminClient();

  return Promise.all(
    items.map(async (item) => {
      const path = item.image_url;

      if (!path) {
        return { ...item, image_signed_url: null };
      }

      const { data, error } = await adminClient.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);

      if (error) {
        console.error("Signed URL error:", error.message);
      }

      return {
        ...item,
        image_signed_url: data?.signedUrl ?? null,
      };
    })
  );
}

// GET /api/admin/tour-itinerary?tour_id=47
export async function GET(request: Request) {
  try {
    const { supabase, response } = await getAdminClient();
    if (response) return response;

    const tourId = Number(
      new URL(request.url).searchParams.get("tour_id")
    );

    if (!isPositiveId(tourId)) {
      return NextResponse.json(
        { error: "A valid tour_id is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tour_itinerary")
      .select("*")
      .eq("tour_id", tourId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;

    const items = await attachSignedUrls(data ?? []);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Get itinerary error:", error);

    return NextResponse.json(
      { error: "Unable to load itinerary." },
      { status: 500 }
    );
  }
}

// POST /api/admin/tour-itinerary
export async function POST(request: Request) {
  try {
    const { supabase, response } = await getAdminClient();
    if (response) return response;

    const body = (await request.json()) as ItineraryBody;

    if (!isPositiveId(body.tour_id)) {
      return NextResponse.json(
        { error: "A valid tour_id is required." },
        { status: 400 }
      );
    }

    const imagePath = normalizeImagePath(body.image_url, body.tour_id);
    if (imagePath === undefined) {
      return NextResponse.json(
        { error: "Invalid itinerary image path." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tour_itinerary")
      .insert({
        tour_id: body.tour_id,
        time: body.time?.trim() || null,
        activity_en: body.activity_en?.trim() || null,
        activity_zh: body.activity_zh?.trim() || null,
        activity_th: body.activity_th?.trim() || null,
        sort_order: body.sort_order ?? 0,
        image_url: imagePath,
      })
      .select("*")
      .single();

    if (error) throw error;

    const [item] = await attachSignedUrls([data]);

    try {
      revalidatePath(`/[locale]/tours/${body.tour_id}`, "page");
      revalidatePath("/[locale]/tours", "page");
    } catch (revErr) {
      console.warn("Itinerary revalidate error:", revErr);
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create itinerary error:", error);

    return NextResponse.json(
      { error: "Unable to create itinerary item." },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tour-itinerary
export async function PATCH(request: Request) {
  try {
    const { supabase, response } = await getAdminClient();
    if (response) return response;

    const body = (await request.json()) as ItineraryBody;

    if (!isPositiveId(body.id) || !isPositiveId(body.tour_id)) {
      return NextResponse.json(
        { error: "Valid id and tour_id are required." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      time: body.time?.trim() || null,
      activity_en: body.activity_en?.trim() || null,
      activity_zh: body.activity_zh?.trim() || null,
      activity_th: body.activity_th?.trim() || null,
      sort_order: body.sort_order ?? 0,
    };

    if (body.image_url !== undefined) {
      const imagePath = normalizeImagePath(body.image_url, body.tour_id);

      if (imagePath === undefined) {
        return NextResponse.json(
          { error: "Invalid itinerary image path." },
          { status: 400 }
        );
      }

      updates.image_url = imagePath;
    }

    const { data, error } = await supabase
      .from("tour_itinerary")
      .update(updates)
      .eq("id", body.id)
      .eq("tour_id", body.tour_id)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Itinerary item not found." },
        { status: 404 }
      );
    }

    const [item] = await attachSignedUrls([data]);

    try {
      revalidatePath(`/[locale]/tours/${body.tour_id}`, "page");
      revalidatePath("/[locale]/tours", "page");
    } catch (revErr) {
      console.warn("Itinerary revalidate error:", revErr);
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update itinerary error:", error);

    return NextResponse.json(
      { error: "Unable to update itinerary item." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tour-itinerary
export async function DELETE(request: Request) {
  try {
    const { supabase, response } = await getAdminClient();
    if (response) return response;

    const body = (await request.json()) as {
      id?: number;
      tour_id?: number;
    };

    if (!isPositiveId(body.id) || !isPositiveId(body.tour_id)) {
      return NextResponse.json(
        { error: "Valid id and tour_id are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tour_itinerary")
      .delete()
      .eq("id", body.id)
      .eq("tour_id", body.tour_id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Itinerary item not found." },
        { status: 404 }
      );
    }

    try {
      revalidatePath(`/[locale]/tours/${body.tour_id}`, "page");
      revalidatePath("/[locale]/tours", "page");
    } catch (revErr) {
      console.warn("Itinerary delete revalidate error:", revErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete itinerary error:", error);

    return NextResponse.json(
      { error: "Unable to delete itinerary item." },
      { status: 500 }
    );
  }
}
