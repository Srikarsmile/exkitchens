import assert from "node:assert/strict";
import test from "node:test";
import {
  applySecurityHeaders,
  getClientAddress,
  isSameOriginRequest,
  resetRateLimitStore,
  takeRateLimitToken,
} from "../lib/request-guards.ts";
import {
  getListingConditionLabel,
  getVisibleListingTags,
} from "../lib/marketplace-shared.ts";
import { buildHomePageStructuredData } from "../lib/seo.ts";

test("getClientAddress prefers the first forwarded address", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.10, 203.0.113.4",
    "x-real-ip": "203.0.113.4",
  });

  assert.equal(getClientAddress(headers), "198.51.100.10");
});

test("takeRateLimitToken blocks after the configured limit inside one window", () => {
  resetRateLimitStore();

  const first = takeRateLimitToken({
    namespace: "test",
    identifier: "buyer-1",
    limit: 2,
    windowMs: 60_000,
    now: 1_000,
  });
  const second = takeRateLimitToken({
    namespace: "test",
    identifier: "buyer-1",
    limit: 2,
    windowMs: 60_000,
    now: 2_000,
  });
  const third = takeRateLimitToken({
    namespace: "test",
    identifier: "buyer-1",
    limit: 2,
    windowMs: 60_000,
    now: 3_000,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
  assert.equal(third.remaining, 0);
  assert.equal(third.retryAfterMs > 0, true);
});

test("isSameOriginRequest only accepts matching origins", () => {
  assert.equal(
    isSameOriginRequest(
      "https://www.exkitchens.com/api/auth/register",
      new Headers({ origin: "https://www.exkitchens.com" }),
    ),
    true,
  );

  assert.equal(
    isSameOriginRequest(
      "https://www.exkitchens.com/api/auth/register",
      new Headers({ origin: "https://attacker.example" }),
    ),
    false,
  );
});

test("applySecurityHeaders adds baseline response protections", () => {
  const response = new Response(null, { status: 204 });
  applySecurityHeaders(response, false);

  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(
    response.headers.get("Content-Security-Policy") || "",
    /frame-ancestors 'none'/,
  );
});

test("buildHomePageStructuredData avoids hard-coded review claims", () => {
  const structuredData = buildHomePageStructuredData(
    "https://www.exkitchens.com",
    "+44 20 3996 2398",
  );

  assert.equal(Array.isArray(structuredData), true);
  assert.equal(
    structuredData.some((entry) => "aggregateRating" in entry),
    false,
  );
});

test("getListingConditionLabel recognises used kitchens", () => {
  assert.equal(
    getListingConditionLabel("Used kitchen", "Pre-loved shaker kitchen"),
    "Used kitchen",
  );
});

test("getListingConditionLabel recognises ex-display kitchens", () => {
  assert.equal(
    getListingConditionLabel("Rotpunkt display kitchen", "showroom stock"),
    "Ex-display",
  );
});

test("getVisibleListingTags removes structured condition tags", () => {
  assert.deepEqual(
    getVisibleListingTags([
      "condition:ex-display",
      "Dekton",
      "Island",
      "dekton",
    ]),
    ["Dekton", "Island"],
  );
});
