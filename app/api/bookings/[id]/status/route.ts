import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const cleanId = id.replace(/^BK-/i, "").trim();
    const isNumeric = /^[1-9]\d*$/.test(cleanId) && Number.isSafeInteger(Number(cleanId));

    const url = new URL(request.url);
    const accessToken = url.searchParams.get("token");

    const supabase = createAdminClient();

    let query = supabase
      .from("Bookings")
      .select("id, booking_code, status, approved_at, admin_reviewed_at");

    if (isNumeric) {
      query = query.or(`id.eq.${Number(cleanId)},booking_code.eq.${id}`);
    } else {
      query = query.eq("booking_code", id);
    }

    if (accessToken && /^[a-f0-9]{64}$/i.test(accessToken)) {
      const accessTokenHash = createHash("sha256")
        .update(accessToken)
        .digest("hex");
      query = query.eq("access_token_hash", accessTokenHash);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error) {
      console.error("Booking status lookup failed:", error);
      return NextResponse.json(
        { error: "Unable to retrieve booking status." },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        bookingId: String(booking.id),
        bookingCode: booking.booking_code,
        status: booking.status,
        approvedAt: booking.approved_at,
        adminReviewedAt: booking.admin_reviewed_at,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Booking status API error:", error);
    return NextResponse.json(
      { error: "Unable to retrieve booking status." },
      { status: 500 }
    );
  }
}
