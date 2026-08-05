export function stripeSecretKey(env = {}) {
  // Prefer the canonical binding; retain the deployed legacy name until the
  // provider-side binding can be migrated in an explicitly approved release.
  const configured = env.STRIPE_SECRET_KEY || env.Stripe_Secrete_Key || '';
  return String(configured).trim();
}
