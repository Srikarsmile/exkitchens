"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getSiteUrl,
  isResendConfigured,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/env";
import {
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  message?: string;
  errors?: {
    fullName?: string[];
    phone?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
}

interface AuthFlowContext {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  nextPath: string;
  origin: string;
}

interface PasswordResetContext {
  email: string;
  origin: string;
}

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number.")
    .max(32, "Phone number is too long."),
  companyWebsite: z.string().optional(),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm the new password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

function normaliseNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/marketplace";
  }

  return value;
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

async function tryCustomSignUpFlow(
  context: AuthFlowContext,
): Promise<{ kind: "fallback" } | { kind: "error"; message: string } | { kind: "ok" }> {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { kind: "fallback" };
  }

  let generatedUserId: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email: context.email,
      password: context.password,
      options: {
        redirectTo: `${context.origin}/auth/confirm?next=${encodeURIComponent(
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

    const verificationUrl = `${context.origin}/auth/confirm?token_hash=${encodeURIComponent(
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
      return { kind: "fallback" };
    }

    return { kind: "ok" };
  } catch (error) {
    console.error("Custom signup flow failed unexpectedly", error);
    await deleteGeneratedUser(generatedUserId);
    return { kind: "fallback" };
  }
}

async function signUpWithSupabaseClient(context: AuthFlowContext) {
  const supabase = await createClient();

  return supabase.auth.signUp({
    email: context.email,
    password: context.password,
    options: {
      emailRedirectTo: `${context.origin}/auth/confirm?next=${encodeURIComponent(
        context.nextPath,
      )}`,
      data: {
        full_name: context.fullName,
        phone: context.phone,
      },
    },
  });
}

async function tryCustomPasswordResetFlow(
  context: PasswordResetContext,
): Promise<"fallback" | "ok"> {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return "fallback";
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: context.email,
      options: {
        redirectTo: `${context.origin}/auth/confirm?next=${encodeURIComponent(
          "/reset-password",
        )}`,
      },
    });

    if (error) {
      console.error("Failed to generate password recovery link", error);
      return "fallback";
    }

    const hashedToken = data.properties?.hashed_token;

    if (!hashedToken) {
      throw new Error("Supabase did not return a password recovery token.");
    }

    const recipientName =
      typeof data.user?.user_metadata?.full_name === "string"
        ? data.user.user_metadata.full_name
        : null;

    const resetUrl = `${context.origin}/auth/confirm?token_hash=${encodeURIComponent(
      hashedToken,
    )}&type=recovery&next=${encodeURIComponent("/reset-password")}`;

    const emailResult = await sendPasswordResetEmail({
      recipientEmail: context.email,
      recipientName,
      resetUrl,
    });

    if (emailResult.error) {
      console.error("Failed to send password recovery email", emailResult.error);
      return "fallback";
    }

    return "ok";
  } catch (error) {
    console.error("Custom password reset flow failed unexpectedly", error);
    return "fallback";
  }
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before signing in.",
    };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { message: error.message };
  }

  redirect(normaliseNextPath(parsed.data.next));
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before creating accounts.",
    };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
    companyWebsite: formData.get("companyWebsite"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || getSiteUrl();
  const nextPath = normaliseNextPath(parsed.data.next);
  const context: AuthFlowContext = {
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    password: parsed.data.password,
    nextPath,
    origin,
  };

  // Hidden field used as a lightweight spam trap. Real users never see it.
  if (parsed.data.companyWebsite?.trim()) {
    redirect(`/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`);
  }

  const customFlowResult = await tryCustomSignUpFlow(context);

  if (customFlowResult.kind === "error") {
    return { message: customFlowResult.message };
  }

  if (customFlowResult.kind === "ok") {
    redirect(`/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`);
  }

  const { data, error } = await signUpWithSupabaseClient(context);

  if (error) {
    return { message: error.message };
  }

  if (!data.session) {
    redirect(`/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`);
  }

  redirect(nextPath);
}

export async function signOutAction() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before resetting passwords.",
    };
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || getSiteUrl();
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(
    "/reset-password",
  )}`;

  if ((await tryCustomPasswordResetFlow({ email: parsed.data.email, origin })) === "ok") {
    redirect("/login?resetEmail=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    return { message: error.message };
  }

  redirect("/login?resetEmail=1");
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return {
      message:
        "Supabase is not configured yet. Add the environment variables before updating passwords.",
    };
  }

  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { message: error.message };
  }

  redirect("/account?passwordUpdated=1");
}
