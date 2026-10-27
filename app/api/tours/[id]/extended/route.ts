import { NextResponse } from "next/server";
import { getTourExtendedData } from "@/lib/tour-extended";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tourId = Number(id);

    if (!tourId || Number.isNaN(tourId)) {
      return NextResponse.json({ error: "Invalid tour ID" }, { status: 400 });
    }

    const data = await getTourExtendedData(tourId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Public get tour extended error:", err);
    return NextResponse.json({ error: "Failed to load tour details" }, { status: 500 });
  }
}
