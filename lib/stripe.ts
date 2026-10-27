import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripeServer(): Stripe {
  const secretKey =
    process.env.STRIPE_SECRET_KEY ||
    "sk_test_51US4WN19PLKP1cq1LmBPKDCYnSERujjKONC6Ickfje4Jgilxw4jxyfzMxRR2KtKDzPylA88yrHnCocwOLRS27rk000DrGE1bEy";

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia" as any,
      typescript: true,
    });
  }
  return stripeInstance;
}

export function getStripePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51US4WN19PLKP1cq1E4NurSOkbD5yd0S4YCMRRIlzcJcRmvQ9fs9gRx8WotjYxxZRez0Bs9cwXCzlJTPX63i3BQnn00Ao9zJPun"
  );
}
