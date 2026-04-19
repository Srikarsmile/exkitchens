import { NextResponse, type NextRequest } from "next/server";
import {
  normaliseNextPath,
  sendBrandedSignupVerification,
  signUpSchema,
} from "@/lib/auth-flows";
import { isSupabaseConfigured } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Supabase is not configured yet. Add the environment variables before creating accounts.",
      },
      { status: 503 },
    );
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
