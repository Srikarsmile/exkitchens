import { z } from "zod";
import { getSiteUrl, isResendConfigured, isSupabaseAdminConfigured } from "@/lib/env";
import {
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthFlowContext {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  nextPath: string;
  origin: string;
}

export interface PasswordResetContext {
  email: string;
  origin: string;
}

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(32, "Phone number is too long."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
  companyWebsite: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export function normaliseNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/marketplace";
  }

  return value;
}

function resolveOrigin(origin?: string | null) {
  return getSiteUrl(origin);
}

async function deleteGeneratedUser(userId: string | null) {
  if (!userId || !isSupabaseAdminConfigured()) {
    return;
  }

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error("Failed to delete generated auth user after email failure", error);
  }
}

export async function sendBrandedSignupVerification(
  context: AuthFlowContext,
): Promise<{ kind: "ok" } | { kind: "error"; message: string }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      kind: "error",
      message: "Account verification is not configured on the server yet.",
    };
  }

  if (!isResendConfigured()) {
    return {
      kind: "error",
      message: "Email delivery is not configured on the server yet.",
    };
  }

  let generatedUserId: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email: context.email,
      password: context.password,
      options: {
        redirectTo: `${resolveOrigin(context.origin)}/auth/confirm?next=${encodeURIComponent(
          context.nextPath,
        )}`,
        data: {
          full_name: context.fullName,
          phone: context.phone,
        },
      },
    });

    if (error) {
      return { kind: "error", message: error.message };
    }

    generatedUserId = data.user?.id ?? null;

    const hashedToken = data.properties?.hashed_token;

    if (!hashedToken) {
      throw new Error("Supabase did not return a signup verification token.");
    }

    const verificationUrl = `${resolveOrigin(
      context.origin,
    )}/auth/confirm?token_hash=${encodeURIComponent(
      hashedToken,
    )}&type=signup&next=${encodeURIComponent(context.nextPath)}`;
    const emailResult = await sendAccountVerificationEmail({
      recipientEmail: context.email,
      recipientName: context.fullName,
      verificationUrl,
    });

    if (emailResult.error) {
      console.error("Custom signup verification email failed", emailResult.error);
      await deleteGeneratedUser(generatedUserId);
      return {
        kind: "error",
        message: "We could not send the verification email. Try again.",
      };
    }

    return { kind: "ok" };
  } catch (error) {
    console.error("Custom signup flow failed unexpectedly", error);
    await deleteGeneratedUser(generatedUserId);
    return {
      kind: "error",
      message: "We could not create the account. Try again.",
    };
  }
}

export async function sendBrandedPasswordReset(
  context: PasswordResetContext,
): Promise<{ kind: "ok" } | { kind: "error"; message: string }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      kind: "error",
      message: "Password reset is not configured on the server yet.",
    };
  }

  if (!isResendConfigured()) {
    return {
      kind: "error",
      message: "Email delivery is not configured on the server yet.",
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: context.email,
      options: {
        redirectTo: `${resolveOrigin(context.origin)}/auth/confirm?next=${encodeURIComponent(
          "/reset-password",
        )}`,
      },
    });

    if (error) {
      console.error("Failed to generate password recovery link", error);

      return {
        kind: "error",
        message: "We could not send the reset email. Try again.",
      };
    }

    const hashedToken = data.properties?.hashed_token;

    if (!hashedToken) {
      throw new Error("Supabase did not return a password recovery token.");
    }

    const recipientName =
      typeof data.user?.user_metadata?.full_name === "string"
        ? data.user.user_metadata.full_name
        : null;
    const resetUrl = `${resolveOrigin(
      context.origin,
    )}/auth/confirm?token_hash=${encodeURIComponent(
      hashedToken,
    )}&type=recovery&next=${encodeURIComponent("/reset-password")}`;
    const emailResult = await sendPasswordResetEmail({
      recipientEmail: context.email,
      recipientName,
      resetUrl,
    });

    if (emailResult.error) {
      console.error("Failed to send password recovery email", emailResult.error);
      return {
        kind: "error",
        message: "We could not send the reset email. Try again.",
      };
    }

    return { kind: "ok" };
  } catch (error) {
    console.error("Custom password reset flow failed unexpectedly", error);
    return {
      kind: "error",
      message: "We could not send the reset email. Try again.",
    };
  }
}
