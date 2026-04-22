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

function getFailureRedirect(request: NextRequest, type: EmailOtpType | null, nextPath: string) {
  if (type === "recovery" || nextPath === "/reset-password") {
    return new URL("/forgot-password?error=confirm_failed", request.url);
  }

  return new URL("/login?error=confirm_failed", request.url);
}

function getIntentCopy(type: EmailOtpType | null, nextPath: string) {
  const isRecovery = type === "recovery" || nextPath === "/reset-password";

  if (isRecovery) {
    return {
      eyebrow: "Password Reset",
      title: "Reset your password",
      body: "Continue in your browser to open the secure password reset screen.",
      actionLabel: "Continue to reset password",
    };
  }

  return {
    eyebrow: "Email Confirmation",
    title: "Confirm your Ex Kitchens account",
    body: "Continue in your browser to verify your email address and finish account setup.",
    actionLabel: "Continue to verify email",
  };
}

function renderTokenConfirmationPage(request: NextRequest, options: {
  tokenHash: string;
  type: EmailOtpType | null;
  nextPath: string;
}) {
  const { eyebrow, title, body, actionLabel } = getIntentCopy(
    options.type,
    options.nextPath,
  );
  const actionUrl = new URL("/auth/confirm", request.url).toString();
  const escapedTokenHash = options.tokenHash
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const escapedType = (options.type || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const escapedNextPath = options.nextPath
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#f3f5f3;font-family:Inter,Arial,sans-serif;color:#111111;">
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <section style="width:100%;max-width:560px;border:1px solid #dfe5df;border-radius:28px;background:#ffffff;box-shadow:0 30px 80px rgba(17,17,17,0.08);overflow:hidden;">
        <div style="padding:28px 32px;border-bottom:1px solid #eef2ef;">
          <div style="color:#3d7a44;font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">Ex Kitchens</div>
          <p style="margin:18px 0 0;color:#3d7a44;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">${eyebrow}</p>
          <h1 style="margin:12px 0 0;font-size:34px;font-weight:400;line-height:1.1;">${title}</h1>
          <p style="margin:14px 0 0;color:#4b5563;font-size:15px;line-height:1.7;">${body}</p>
        </div>
        <div style="padding:28px 32px 32px;">
          <form method="post" action="${actionUrl}" style="margin:0;">
            <input type="hidden" name="token_hash" value="${escapedTokenHash}" />
            <input type="hidden" name="type" value="${escapedType}" />
            <input type="hidden" name="next" value="${escapedNextPath}" />
            <button type="submit" style="display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:#111111;color:#ffffff;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:16px 24px;cursor:pointer;">
              ${actionLabel}
            </button>
          </form>
          <p style="margin:20px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
            This extra step keeps email security scanners from consuming your one-time link before you use it.
          </p>
        </div>
      </section>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

async function completeVerification({
  request,
  code,
  tokenHash,
  type,
  nextPath,
}: {
  request: NextRequest;
  code: string | null;
  tokenHash: string | null;
  type: EmailOtpType | null;
  nextPath: string;
}) {
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

  return NextResponse.redirect(getFailureRedirect(request, type, nextPath));
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

  if (tokenHash) {
    return renderTokenConfirmationPage(request, {
      tokenHash,
      type,
      nextPath,
    });
  }

  try {
    return await completeVerification({
      request,
      code,
      tokenHash: null,
      type,
      nextPath,
    });
  } catch (error) {
    console.error("Auth confirmation failed unexpectedly", error);
  }

  return NextResponse.redirect(getFailureRedirect(request, type, nextPath));
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const tokenHash = String(formData.get("token_hash") || "").trim();
  const typeValue = String(formData.get("type") || "").trim();
  const type = typeValue ? (typeValue as EmailOtpType) : null;
  const fallbackPath = type === "recovery" ? "/reset-password" : "/account";
  const nextPath = normaliseRedirectPath(
    String(formData.get("next") || ""),
    request.url,
    fallbackPath,
  );

  if (!tokenHash) {
    return NextResponse.redirect(getFailureRedirect(request, type, nextPath));
  }

  try {
    return await completeVerification({
      request,
      code: null,
      tokenHash,
      type,
      nextPath,
    });
  } catch (error) {
    console.error("Auth confirmation post failed unexpectedly", error);
    return NextResponse.redirect(getFailureRedirect(request, type, nextPath));
  }
}
