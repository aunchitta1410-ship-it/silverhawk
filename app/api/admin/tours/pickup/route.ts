import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTourPickupData, saveTourPickupData } from "@/lib/tour-pickup";
import { addAuditLog } from "@/lib/audit-log";
import { getAdminEmail } from "@/lib/admin-email";

export const runtime = "nodejs";

async function verifyAdmin() {
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return {
      errorResponse: NextResponse.json(
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

  if (adminError || !admin) {
    return {
      errorResponse: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

// GET /api/admin/tours/pickup?tour_id=...
export async function GET(request: Request) {
  try {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const url = new URL(request.url);
    const tourId = Number(url.searchParams.get("tour_id"));

    if (!tourId || !Number.isSafeInteger(tourId) || tourId <= 0) {
      return NextResponse.json(
        { error: "A valid tour_id is required." },
        { status: 400 }
      );
    }

    const data = await getTourPickupData(tourId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET tour pickup error:", error);
    return NextResponse.json(
      { error: "Unable to load tour pickup information." },
      { status: 500 }
    );
  }
}

// POST /api/admin/tours/pickup
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const tourId = Number(body.tour_id);

    if (!tourId || !Number.isSafeInteger(tourId) || tourId <= 0) {
      return NextResponse.json(
        { error: "A valid tour_id is required." },
        { status: 400 }
      );
    }

    const updated = await saveTourPickupData(tourId, {
      enable_transfer: body.enable_transfer,
      enable_meeting_point: body.enable_meeting_point,
      meeting_point: body.meeting_point,
      meeting_time: body.meeting_time,
      additional_notes: body.additional_notes,
      pickup_locations: body.pickup_locations,
    });

    const adminEmail = await getAdminEmail(user?.email);
    await addAuditLog({
      action: "UPDATE_PICKUP",
      adminEmail,
      targetType: "tour",
      targetId: tourId,
      description: `Updated transfer & pick-up locations for tour #${tourId}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("POST tour pickup error:", error);
    return NextResponse.json(
      { error: "Unable to save tour pickup information." },
      { status: 500 }
    );
  }
}

