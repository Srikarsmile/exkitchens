import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function normaliseRedirectPath(
  value: string | null,
  requestUrl: string,
  fallbackPath: string,
) {
  if (!value) {
    return fallbackPath;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const requestedUrl = new URL(requestUrl);
    const candidate = new URL(value, requestedUrl.origin);

    if (candidate.origin === requestedUrl.origin) {
      return `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }
  } catch {}

  return fallbackPath;
}

function getVerificationTypes(
  type: EmailOtpType | null,
  nextPath: string,
): EmailOtpType[] {
  if (type) {
    return [type];
  }

  if (nextPath === "/reset-password") {
    return ["recovery"];
  }

  return ["signup", "email"];
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallbackPath = type === "recovery" ? "/reset-password" : "/account";
  const nextPath = normaliseRedirectPath(
    searchParams.get("next") || searchParams.get("redirect_to"),
    request.url,
    fallbackPath,
  );

  try {
    const supabase = await createClient();
    let verifiedUser:
      | {
          email?: string | undefined;
          user_metadata?: Record<string, unknown> | undefined;
        }
      | null = null;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        verifiedUser = data.user;
      }
    } else if (tokenHash) {
      const verificationTypes = getVerificationTypes(type, nextPath);

      for (const verificationType of verificationTypes) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: verificationType,
          token_hash: tokenHash,
        });

        if (!error) {
          verifiedUser = data.user;
          break;
        }
      }
    }

    if (verifiedUser) {
      if (
        (type === null || type === "signup" || type === "email") &&
        verifiedUser.email
      ) {
        const recipientName =
          typeof verifiedUser.user_metadata?.full_name === "string"
            ? verifiedUser.user_metadata.full_name
            : null;

        try {
          const result = await sendWelcomeEmail({
            recipientEmail: verifiedUser.email,
            recipientName,
          });

          if (result.error) {
            console.error("Welcome email failed after auth confirmation", result.error);
          }
        } catch (error) {
          console.error("Welcome email threw after auth confirmation", error);
        }
      }

      return NextResponse.redirect(
        new URL(nextPath.startsWith("/") ? nextPath : "/account", request.url),
      );
    }
  } catch (error) {
    console.error("Auth confirmation failed unexpectedly", error);
  }

  return NextResponse.redirect(new URL("/login?error=confirm_failed", request.url));
}
