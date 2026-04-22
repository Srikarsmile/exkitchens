const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const marketplaceSupportPhone =
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPPORT_PHONE ||
  process.env.MARKETPLACE_SUPPORT_PHONE ||
  "07913546586";

function normaliseUrl(input?: string | null) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return candidate.replace(/\/+$/, "");
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseEnv() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
  };
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseAdminEnv() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase admin access is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    url: supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey,
  };
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey && stripeWebhookSecret);
}

export function getStripeEnv() {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
    );
  }

  return {
    secretKey: stripeSecretKey,
    webhookSecret: stripeWebhookSecret,
  };
}

export function isResendConfigured() {
  return Boolean(resendApiKey);
}

export function getResendEnv() {
  if (!resendApiKey) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY.");
  }

  return {
    apiKey: resendApiKey,
  };
}

export function getMarketplaceEmailFrom() {
  return (
    process.env.MARKETPLACE_EMAIL_FROM ||
    "Ex Kitchens <info@updates.exkitchens.com>"
  );
}

export function getMarketplaceCronSecret() {
  return process.env.MARKETPLACE_CRON_SECRET || "";
}

export function getMarketplaceSupportPhone() {
  return marketplaceSupportPhone;
}

export function getMarketplaceSupportPhoneHref() {
  const trimmed = marketplaceSupportPhone.trim();

  if (!trimmed) {
    return "";
  }

  const digits = trimmed.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return `tel:${digits}`;
  }

  if (digits.startsWith("0")) {
    return `tel:+44${digits.slice(1)}`;
  }

  return `tel:${digits}`;
}

export function getSiteUrl(origin?: string | null) {
  return (
    normaliseUrl(origin) ||
    normaliseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normaliseUrl(process.env.SITE_URL) ||
    normaliseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normaliseUrl(process.env.VERCEL_URL) ||
    "http://localhost:3000"
  );
}
