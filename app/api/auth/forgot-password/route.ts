import { NextResponse, type NextRequest } from "next/server";
import {
  passwordResetRequestSchema,
  sendBrandedPasswordReset,
} from "@/lib/auth-flows";
import { isSupabaseConfigured } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Supabase is not configured yet. Add the environment variables before resetting passwords.",
      },
      { status: 503 },
    );
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
