import { NextResponse } from "next/server";
import { getPaymentSettings } from "@/lib/payment-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("GET payment settings error:", error);
    return NextResponse.json(
      { error: "Failed to load payment settings" },
      { status: 500 }
    );
  }
}
