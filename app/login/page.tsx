import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthPageShell from "@/app/components/AuthPageShell";
import LoginForm from "@/app/login/LoginForm";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Login | ExKitchens",
  robots: {
    index: false,
    follow: false,
  },
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/marketplace";
  const checkEmail = params.checkEmail === "1";
  const resetEmail = params.resetEmail === "1";
  const confirmFailed = params.error === "confirm_failed";
  const viewer = await getViewer();

  if (viewer.user) {
    redirect(nextPath);
  }

  return (
    <AuthPageShell
      eyebrow="Buyer Login"
      title="Sign in without leaving the marketplace behind."
      description="Watch listings, follow pricing, and keep every order update inside your Ex Kitchens account."
      primaryCta={
        <Link
          href="/marketplace"
          className="rounded-full bg-white/12 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-[#111111]"
        >
          Browse marketplace
        </Link>
      }
      secondaryCta={
        <Link
          href="/register"
          className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/82 transition hover:bg-white/10 hover:text-white"
        >
          Create account
        </Link>
      }
      notices={
        <>
          {!isSupabaseConfigured() ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Add Supabase environment variables before using auth.
            </p>
          ) : null}

          {checkEmail ? (
            <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Check your inbox for the Ex Kitchens verification email, then sign
              in to keep your saved listings and orders together.
            </p>
          ) : null}

          {resetEmail ? (
            <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Check your email for the password reset link. Open it on this site,
              then choose a new password.
            </p>
          ) : null}

          {confirmFailed ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              That verification link is invalid or has expired. Create the account
              again or contact support if you still need access.
            </p>
          ) : null}
        </>
      }
      asideTitle="A cleaner route back into watchlists and orders."
      asideBody="Your account stays part of the same Ex Kitchens experience, not a detached admin screen."
      asidePoints={[
        "Track watchlists, orders, and account updates in one place.",
        "Email verification keeps buyer accounts cleaner.",
        "Password recovery links bring you straight back into the marketplace flow.",
      ]}
      form={<LoginForm nextPath={nextPath} />}
    />
  );
}
