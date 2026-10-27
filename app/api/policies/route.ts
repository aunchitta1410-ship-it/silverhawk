import { NextResponse } from "next/server";
import { getSitePolicies } from "@/lib/site-policies";

export async function GET() {
  try {
    const policies = await getSitePolicies();
    return NextResponse.json({ success: true, policies });
  } catch (err) {
    console.error("Get policies error:", err);
    return NextResponse.json(
      { error: "Failed to load policies" },
      { status: 500 }
    );
  }
}
