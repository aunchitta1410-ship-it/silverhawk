import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getStripePublishableKey } from "./stripe";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeClientPromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const pubKey = getStripePublishableKey();
    stripePromise = loadStripe(pubKey);
  }
  return stripePromise;
}
