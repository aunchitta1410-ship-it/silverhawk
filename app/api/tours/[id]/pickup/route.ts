import { NextResponse } from "next/server";
import { getTourPickupData } from "@/lib/tour-pickup";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let tourId = Number(id);

    // If id is not a number, try looking up by tour title
    if (!tourId || !Number.isSafeInteger(tourId)) {
      const adminClient = createAdminClient();
      const decodedTitle = decodeURIComponent(id);
      const { data: tour } = await adminClient
        .from("tours")
        .select("id")
        .or(`title_en.eq.${decodedTitle},title_zh.eq.${decodedTitle},title_th.eq.${decodedTitle}`)
        .maybeSingle();

      if (tour?.id) {
        tourId = tour.id;
      }
    }

    if (!tourId || tourId <= 0) {
      return NextResponse.json(
        { error: "Invalid tour identifier" },
        { status: 400 }
      );
    }

    const data = await getTourPickupData(tourId);

    // Return only active pickup locations for customers
    const activeLocations = (data.pickup_locations || []).filter(
      (loc) => loc.is_active
    );

    return NextResponse.json({
      success: true,
      tour_id: tourId,
      enable_transfer: data.enable_transfer,
      enable_meeting_point: data.enable_meeting_point !== false,
      meeting_point: data.meeting_point,
      meeting_time: data.meeting_time,
      additional_notes: data.additional_notes,
      pickup_locations: activeLocations,
    });
  } catch (error) {
    console.error("Public tour pickup fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pickup details" },
      { status: 500 }
    );
  }
}

