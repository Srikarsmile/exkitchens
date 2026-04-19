import Link from "next/link";
import AuthPageShell from "@/app/components/AuthPageShell";
import ForgotPasswordForm from "@/app/forgot-password/ForgotPasswordForm";
import { getViewer } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const viewer = await getViewer();

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
