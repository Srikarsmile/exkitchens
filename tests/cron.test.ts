import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedCronRequest } from "../lib/cron.ts";

function withCronSecrets(
  secrets: {
    CRON_SECRET?: string;
    MARKETPLACE_CRON_SECRET?: string;
  },
  callback: () => void,
) {
  const previousCronSecret = process.env.CRON_SECRET;
  const previousMarketplaceSecret = process.env.MARKETPLACE_CRON_SECRET;

  if (secrets.CRON_SECRET) {
    process.env.CRON_SECRET = secrets.CRON_SECRET;
  } else {
    delete process.env.CRON_SECRET;
  }

  if (secrets.MARKETPLACE_CRON_SECRET) {
    process.env.MARKETPLACE_CRON_SECRET = secrets.MARKETPLACE_CRON_SECRET;
  } else {
    delete process.env.MARKETPLACE_CRON_SECRET;
  }

  try {
    callback();
  } finally {
    if (previousCronSecret) {
      process.env.CRON_SECRET = previousCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }

    if (previousMarketplaceSecret) {
      process.env.MARKETPLACE_CRON_SECRET = previousMarketplaceSecret;
    } else {
      delete process.env.MARKETPLACE_CRON_SECRET;
    }
  }
}

test("cron authorization accepts Vercel CRON_SECRET", () => {
  withCronSecrets({ CRON_SECRET: "vercel-secret" }, () => {
    const request = new Request("https://www.exkitchens.com/api/cron/test", {
      headers: { authorization: "Bearer vercel-secret" },
    });

    assert.equal(isAuthorizedCronRequest(request), true);
  });
});

test("cron authorization accepts marketplace cron secret fallback", () => {
  withCronSecrets({ MARKETPLACE_CRON_SECRET: "marketplace-secret" }, () => {
    const request = new Request("https://www.exkitchens.com/api/cron/test", {
      headers: { authorization: "Bearer marketplace-secret" },
    });

    assert.equal(isAuthorizedCronRequest(request), true);
  });
});

test("cron authorization rejects missing or wrong secrets", () => {
  withCronSecrets({ CRON_SECRET: "right-secret" }, () => {
    const missing = new Request("https://www.exkitchens.com/api/cron/test");
    const wrong = new Request("https://www.exkitchens.com/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    assert.equal(isAuthorizedCronRequest(missing), false);
    assert.equal(isAuthorizedCronRequest(wrong), false);
  });
});
