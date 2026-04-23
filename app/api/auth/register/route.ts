import { NextResponse, type NextRequest } from "next/server";
import {
  formatRetryAfter,
  getClientAddress,
  getRateLimitHeaders,
  isSameOriginRequest,
  takeRateLimitToken,
} from "@/lib/request-guards";
import {
  normaliseNextPath,
  sendBrandedSignupVerification,
  signUpSchema,
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
      "Supabase is not configured yet. Add the environment variables before creating accounts.",
      503,
    );
  }

  if (!isSameOriginRequest(request.url, request.headers)) {
    return jsonError("Invalid request origin.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const nextPath = normaliseNextPath(parsed.data.next);

  if (parsed.data.companyWebsite?.trim()) {
    return NextResponse.json({
      ok: true,
      redirectTo: `/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`,
    });
  }

  const signupAttemptLimit = takeRateLimitToken({
    namespace: "auth:register:ip",
    identifier: getClientAddress(request.headers),
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (!signupAttemptLimit.ok) {
    return jsonError(
      `Too many signup attempts. Try again ${formatRetryAfter(
        signupAttemptLimit.retryAfterMs,
      )}.`,
      429,
      getRateLimitHeaders(signupAttemptLimit),
    );
  }

  const result = await sendBrandedSignupVerification({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    password: parsed.data.password,
    nextPath,
    origin: request.nextUrl.origin,
  });

  if (result.kind === "error") {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    redirectTo: `/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`,
  });
}
