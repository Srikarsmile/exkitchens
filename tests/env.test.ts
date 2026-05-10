import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const STRIPE_ENV_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

async function loadEnvModule(
  overrides: Partial<Record<(typeof STRIPE_ENV_KEYS)[number], string>>,
) {
  const previous = Object.fromEntries(
    STRIPE_ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  for (const key of STRIPE_ENV_KEYS) {
    const nextValue = overrides[key];

    if (nextValue) {
      process.env[key] = nextValue;
    } else {
      delete process.env[key];
    }
  }

  const envModule = await import(`../lib/env.ts?test=${randomUUID()}`);

  for (const key of STRIPE_ENV_KEYS) {
    const previousValue = previous[key];

    if (previousValue) {
      process.env[key] = previousValue;
    } else {
      delete process.env[key];
    }
  }

  return envModule;
}

test("Stripe configuration requires a webhook signing secret", async () => {
  const env = await loadEnvModule({
    STRIPE_SECRET_KEY: "sk_live_example",
    STRIPE_WEBHOOK_SECRET: "pk_live_not_a_webhook_secret",
  });

  assert.equal(env.getStripeMode(), "live");
  assert.equal(env.hasValidStripeWebhookSecret(), false);
  assert.equal(env.isStripeConfigured(), false);
  assert.throws(
    () => env.getStripeEnv(),
    /Stripe webhook secret is invalid/,
  );
});

test("Stripe configuration accepts live keys with whsec webhook secret", async () => {
  const env = await loadEnvModule({
    STRIPE_SECRET_KEY: "sk_live_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
  });

  assert.equal(env.getStripeMode(), "live");
  assert.equal(env.hasValidStripeWebhookSecret(), true);
  assert.equal(env.isStripeConfigured(), true);
  assert.deepEqual(env.getStripeEnv(), {
    secretKey: "sk_live_example",
    webhookSecret: "whsec_example",
  });
});
