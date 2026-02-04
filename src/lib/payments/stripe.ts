import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripeOrNull() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Stripe(key, {
    typescript: true,
  });
  return cached;
}

export function requireStripe() {
  const stripe = stripeOrNull();
  if (!stripe) {
    throw new Error(
      "Stripe non configuré: définissez STRIPE_SECRET_KEY dans .env.local",
    );
  }
  return stripe;
}

export function requireStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "Webhook Stripe non configuré: définissez STRIPE_WEBHOOK_SECRET dans .env.local",
    );
  }
  return secret;
}
