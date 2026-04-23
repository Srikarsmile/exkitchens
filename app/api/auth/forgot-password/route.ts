import { NextResponse, type NextRequest } from "next/server";
import {
  formatRetryAfter,
  getClientAddress,
  getRateLimitHeaders,
  isSameOriginRequest,
  takeRateLimitToken,
} from "@/lib/request-guards";
import {
  passwordResetRequestSchema,
  sendBrandedPasswordReset,
} from "@/lib/auth-flows";
import { isSupabaseConfigured } from "@/lib/env";

function jsonError(
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ ok: false, message }, { status, headers });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return jsonError(
      "Supabase is not configured yet. Add the environment variables before resetting passwords.",
      503,
    );
  }

  if (!isSameOriginRequest(request.url, request.headers)) {
    return jsonError("Invalid request origin.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = passwordResetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const resetAttemptLimit = takeRateLimitToken({
    namespace: "auth:forgot-password:ip",
    identifier: getClientAddress(request.headers),
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (!resetAttemptLimit.ok) {
    return jsonError(
      `Too many reset requests. Try again ${formatRetryAfter(
        resetAttemptLimit.retryAfterMs,
      )}.`,
      429,
      getRateLimitHeaders(resetAttemptLimit),
    );
  }

  const result = await sendBrandedPasswordReset({
    email: parsed.data.email,
    origin: request.nextUrl.origin,
  });

  if (result.kind === "error") {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    redirectTo: "/login?resetEmail=1",
  });
}
