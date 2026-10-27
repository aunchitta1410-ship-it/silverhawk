
import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      return NextResponse.json(
        { error: "Email configuration is missing" },
        { status: 500 }
      );
    }

    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const body = parsedBody as Record<string, unknown>;

    const rawEmail = body.email;
    const rawBookingId =
      body.bookingId ?? body.booking_id ?? body.id;

    const email =
      typeof rawEmail === "string"
        ? rawEmail.trim().toLowerCase()
        : "";

    const bookingId =
      typeof rawBookingId === "string" ||
      (typeof rawBookingId === "number" &&
        Number.isSafeInteger(rawBookingId))
        ? String(rawBookingId).trim()
        : "";

    // Correct email validation.
    const emailValid =
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValid) {
      console.error("Email validation failed:", {
        emailValid,
        emailType: typeof rawEmail,
      });

      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // This endpoint sends an email for an existing booking.
    if (!bookingId || bookingId.length > 100) {
      console.error("Booking ID validation failed:", {
        bookingIdType: typeof rawBookingId,
        bookingIdLength: bookingId.length,
      });

      return NextResponse.json(
        { error: "Invalid booking ID" },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: "We received your tour booking",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Thank you for your booking request!</h2>
          <p>We have received your tour booking request.</p>
          <p>
            <strong>Booking ID:</strong>
            ${escapeHtml(bookingId)}
          </p>
          <p>
            Your booking is currently pending review.
            We will notify you when its status changes.
          </p>
          <p>Best regards,<br />Silver Hawk Group</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        { error: "Unable to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data?.id,
    });
  } catch (err) {
    console.error("Unexpected email API error:", err);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}