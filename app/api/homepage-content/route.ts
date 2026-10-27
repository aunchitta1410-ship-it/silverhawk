import { NextResponse } from "next/server";
import { getHomepageContent } from "@/lib/homepage-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const content = await getHomepageContent();
    return NextResponse.json(
      { success: true, content },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("Get homepage content error:", err);
    return NextResponse.json(
      { error: "Failed to load homepage content" },
      { status: 500 }
    );
  }
}
