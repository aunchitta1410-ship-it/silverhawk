
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";

const allowedFields = [
  "title_en",
  "title_zh",
  "title_th",
  "description_en",
  "description_zh",
  "description_th",
  "important_info_en",
  "important_info_zh",
  "important_info_th",
  "operated_days",
  "price",
  "child_price",
  "child_age_min",
  "child_age_max",
  "infant_price",
  "infant_age_min",
  "infant_age_max",
  "image_url",
  "tour_type",
  "destination",
  "theme",
  "start_time",
  "end_time",
  "min_people",
  "max_people",
  "duration",
  "tour_source",
  "partner_company",
] as const;

function isValidTextOrNumber(value: unknown) {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function sanitizeTour(body: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (!(field in body)) continue;

    let value = body[field];

    if (!isValidTextOrNumber(value)) {
      throw new Error(`Invalid value for ${field}`);
    }

    if (
      (field === "start_time" || field === "end_time") &&
      value === ""
    ) {
      value = null;
    }

    result[field] = value;
  }

  return result;
}

async function requireAdmin() {
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

  const { data: isAdmin, error: adminError } =
    await supabase.rpc("is_admin");

  if (adminError || isAdmin !== true) {
    console.error("Admin verification failed:", adminError);

    return {
      supabase,
      response: NextResponse.json(
        { error: "Admin permission required." },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, response: null };
}

// GET: Load tours for Tour Management.
export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();

    if (response) return response;

    const { data: tours, error } = await supabase
      .from("tours")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Load tours error:", error);

      return NextResponse.json(
        { error: "Unable to load tours." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tours: tours ?? [],
    });
  } catch (error) {
    console.error("Get tours API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return saveTour(request, false);
}

export async function PATCH(request: Request) {
  return saveTour(request, true);
}

async function saveTour(request: Request, isUpdate: boolean) {
  try {
    const { supabase, user, response } = await requireAdmin();

    if (response) return response;

    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const tourBody = body as Record<string, unknown>;

    if (
      isUpdate &&
      (
        typeof tourBody.id !== "number" ||
        !Number.isSafeInteger(tourBody.id) ||
        tourBody.id <= 0
      )
    ) {
      return NextResponse.json(
        { error: "A valid tour ID is required." },
        { status: 400 }
      );
    }

    const values = sanitizeTour(tourBody);

    if (Object.keys(values).length === 0) {
      return NextResponse.json(
        { error: "No tour fields provided." },
        { status: 400 }
      );
    }

    const hasTitle = [
      "title_en",
      "title_zh",
      "title_th",
    ].some(
      (field) =>
        typeof values[field] === "string" &&
        (values[field] as string).trim().length > 0
    );

    if (!hasTitle) {
      return NextResponse.json(
        {
          error:
            "Enter a tour title in at least one language.",
        },
        { status: 400 }
      );
    }

    const query = isUpdate
      ? supabase
          .from("tours")
          .update(values)
          .eq("id", tourBody.id as number)
      : supabase
          .from("tours")
          .insert(values);

    const { data: tour, error } = await query
      .select("*")
      .single();

    if (error) {
      console.error("Save tour error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const adminEmail = await getAdminEmail(user?.email);
    await addAuditLog({
      action: "UPDATE_TOUR",
      adminEmail,
      targetType: "tour",
      targetId: tour.id,
      description: `${isUpdate ? "Updated" : "Created"} tour #${tour.id}: ${tour.title_en || "Untitled"}`,
    });

    try {
      revalidatePath("/[locale]/tours", "page");
      revalidatePath("/[locale]/tours/[id]", "page");
      revalidatePath("/[locale]", "page");
      revalidatePath("/[locale]/admin/tours", "page");
      revalidatePath("/", "layout");
    } catch (revErr) {
      console.warn("Tour revalidate error:", revErr);
    }

    return NextResponse.json({ tour });
  } catch (error) {
    console.error("Tour API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user, response } = await requireAdmin();

    if (response) return response;

    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const id = (body as Record<string, unknown>).id;

    if (
      typeof id !== "number" ||
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        { error: "A valid tour ID is required." },
        { status: 400 }
      );
    }

    const { data: tour, error } = await supabase
      .from("tours")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Delete tour error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!tour) {
      return NextResponse.json(
        {
          error:
            "Tour not found or deletion was not permitted.",
        },
        { status: 404 }
      );
    }

    const adminEmail = await getAdminEmail(user?.email);
    await addAuditLog({
      action: "UPDATE_TOUR",
      adminEmail,
      targetType: "tour",
      targetId: id,
      description: `Deleted tour #${id}`,
    });

    try {
      revalidatePath("/[locale]/tours", "page");
      revalidatePath("/[locale]/tours/[id]", "page");
      revalidatePath("/[locale]", "page");
      revalidatePath("/[locale]/admin/tours", "page");
      revalidatePath("/", "layout");
    } catch (revErr) {
      console.warn("Tour delete revalidate error:", revErr);
    }

    return NextResponse.json({
      success: true,
      id: tour.id,
    });
  } catch (error) {
    console.error("Delete tour API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
