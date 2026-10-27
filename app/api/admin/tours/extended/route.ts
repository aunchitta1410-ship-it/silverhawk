import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTourExtendedData, getAllTourExtendedData, saveTourExtendedData } from "@/lib/tour-extended";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tourIdParam = searchParams.get("tour_id") || searchParams.get("id");

    if (!tourIdParam) {
      const allData = await getAllTourExtendedData();
      return NextResponse.json({ success: true, data: allData });
    }

    const tourId = Number(tourIdParam);
    if (!tourId || Number.isNaN(tourId)) {
      return NextResponse.json({ error: "Valid tour_id required" }, { status: 400 });
    }

    const data = await getTourExtendedData(tourId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Get tour extended error:", err);
    return NextResponse.json({ error: "Failed to load tour details" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tourId = Number(body.tourId || body.tour_id);

    if (!tourId || Number.isNaN(tourId)) {
      return NextResponse.json({ error: "Valid tourId required" }, { status: 400 });
    }

    const saved = await saveTourExtendedData(tourId, body);

    try {
      revalidatePath("/[locale]/tours", "page");
      revalidatePath("/[locale]/tours/[id]", "page");
      revalidatePath("/[locale]", "page");
      revalidatePath("/[locale]/admin/tours", "page");
      revalidatePath("/", "layout");
    } catch (revErr) {
      console.warn("Tour extended revalidation warning:", revErr);
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    console.error("Save tour extended error:", err);
    return NextResponse.json({ error: "Failed to save tour details" }, { status: 500 });
  }
}
