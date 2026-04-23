type HeaderBag = Pick<Headers, "get">;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  namespace: string;
  identifier: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  ok: boolean;
  key: string;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

const RATE_LIMIT_STORE_KEY = "__exkitchensRateLimitStore";

type GlobalWithRateLimitStore = typeof globalThis & {
  __exkitchensRateLimitStore?: Map<string, RateLimitBucket>;
};

function getRateLimitStore() {
  const globalWithStore = globalThis as GlobalWithRateLimitStore;

  if (!globalWithStore[RATE_LIMIT_STORE_KEY]) {
    globalWithStore[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitBucket>();
  }

  return globalWithStore[RATE_LIMIT_STORE_KEY];
}

function normaliseIdentifier(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed || "anonymous";
}

function pruneRateLimitStore(store: Map<string, RateLimitBucket>, now: number) {
  if (store.size < 1_000) {
    return;
  }

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function resetRateLimitStore() {
  getRateLimitStore().clear();
}

export function takeRateLimitToken({
  namespace,
  identifier,
  limit,
  windowMs,
  now = Date.now(),
}: RateLimitOptions): RateLimitResult {
  const store = getRateLimitStore();
  pruneRateLimitStore(store, now);

  const key = `${namespace}:${normaliseIdentifier(identifier)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });

    return {
      ok: true,
      key,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt,
      retryAfterMs: 0,
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      key,
      limit,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterMs: Math.max(current.resetAt - now, 0),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    ok: true,
    key,
    limit,
    remaining: Math.max(limit - current.count, 0),
    resetAt: current.resetAt,
    retryAfterMs: 0,
  };
}

function parseForwardedAddress(value: string) {
  const forwardedEntry = value
    .split(",")
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith("for="));

  if (!forwardedEntry) {
    return null;
  }

  const candidate = forwardedEntry.slice(4).replace(/^"|"$/g, "");

  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("[")) {
    const closingBracket = candidate.indexOf("]");
    return closingBracket > 1 ? candidate.slice(1, closingBracket) : null;
  }

  return candidate.split(":")[0] || null;
}

export function getClientAddress(headers: HeaderBag) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstHop = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .find(Boolean);

    if (firstHop) {
      return firstHop;
    }
  }

  const forwarded = headers.get("forwarded");
  const forwardedAddress = forwarded ? parseForwardedAddress(forwarded) : null;

  if (forwardedAddress) {
    return forwardedAddress;
  }

  const realIp = headers.get("x-real-ip") || headers.get("cf-connecting-ip");

  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "local";
}

export function isSameOriginRequest(requestUrl: string, headers: HeaderBag) {
  const origin = headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

export function formatRetryAfter(retryAfterMs: number) {
  const totalSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));

  if (totalSeconds < 60) {
    return `in ${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `in about ${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  return `in about ${totalHours} hour${totalHours === 1 ? "" : "s"}`;
}

export function getRateLimitHeaders(result: Pick<RateLimitResult, "limit" | "remaining" | "resetAt" | "retryAfterMs">) {
  return {
    "Retry-After": String(Math.max(1, Math.ceil(result.retryAfterMs / 1_000))),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  };
}

function buildContentSecurityPolicy(isDevelopment: boolean) {
  const scriptSrc = isDevelopment
    ? "'self' 'unsafe-inline' 'unsafe-eval' https:"
    : "'self' 'unsafe-inline' https:";

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "media-src 'self' data: blob: https:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function getSecurityHeaders(
  isDevelopment = process.env.NODE_ENV !== "production",
) {
  return {
    "Content-Security-Policy": buildContentSecurityPolicy(isDevelopment),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    "Cross-Origin-Resource-Policy": "same-site",
  };
}

export function applySecurityHeaders<T extends Response>(
  response: T,
  isDevelopment = process.env.NODE_ENV !== "production",
) {
  const headers = getSecurityHeaders(isDevelopment);

  for (const [name, value] of Object.entries(headers)) {
    if (!response.headers.has(name)) {
      response.headers.set(name, value);
    }
  }

  return response;
}
