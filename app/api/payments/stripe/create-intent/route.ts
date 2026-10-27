import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, amount, customerName, customerEmail } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json(
        { error: "A valid positive payment amount is required." },
        { status: 400 }
      );
    }

    // Stripe THB is zero-decimal or 2-decimal?
    // Thai Baht (THB) is a two-decimal currency: 1 THB = 100 satang.
    const amountInSatang = Math.round(numAmount * 100);

    // Minimum charge for THB is 10.00 THB (1000 satang)
    if (amountInSatang < 1000) {
      return NextResponse.json(
        { error: "Minimum payment amount is 10 THB." },
        { status: 400 }
      );
    }

    const stripe = getStripeServer();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSatang,
      currency: "thb",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      description: `Silver Hawk Group Booking #${bookingId || "N/A"}`,
      metadata: {
        booking_id: String(bookingId || ""),
        customer_name: customerName || "",
        customer_email: customerEmail || "",
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("Stripe create-intent error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize Stripe payment." },
      { status: 500 }
    );
  }
}
