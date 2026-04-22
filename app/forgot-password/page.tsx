import Link from "next/link";
import AuthPageShell from "@/app/components/AuthPageShell";
import ForgotPasswordForm from "@/app/forgot-password/ForgotPasswordForm";
import { getViewer } from "@/lib/auth";

interface ForgotPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const viewer = await getViewer();
  const confirmFailed = params.error === "confirm_failed";

  return (
    <AuthPageShell
      eyebrow="Password Reset"
      title="Send a secure reset link to your inbox."
      description="We’ll email a one-time recovery link so you can choose a new password and get back into the marketplace without losing account history."
      primaryCta={
        <Link
          href="/marketplace"
          className="rounded-full bg-white/12 px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-[#111111]"
        >
          Browse marketplace
        </Link>
      }
      secondaryCta={
        viewer.user ? (
          <Link
            href="/account"
            className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/82 transition hover:bg-white/10 hover:text-white"
          >
            Back to account
          </Link>
        ) : undefined
      }
      notices={
        confirmFailed ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            That reset link is invalid or has expired. Request a fresh password
            reset email below.
          </p>
        ) : undefined
      }
      asideTitle="Recovery should feel native to the site."
      asideBody="Password resets now stay inside the same Ex Kitchens shell, with the same branding and same account context."
      asidePoints={[
        "Recovery links take you back into this site, not a separate auth screen.",
        "Your bids, watchlists, and orders stay untouched when the password changes.",
        "Account protection still depends on verified email ownership.",
      ]}
      form={<ForgotPasswordForm />}
    />
  );
}
