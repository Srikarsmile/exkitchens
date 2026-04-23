import type { Metadata } from "next";
import Link from "next/link";
import AuthPageShell from "@/app/components/AuthPageShell";
import ResetPasswordForm from "@/app/reset-password/ResetPasswordForm";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset Password | ExKitchens",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ResetPasswordPage() {
  const viewer = await getViewer();

  return (
    <AuthPageShell
      eyebrow="Set a New Password"
      title="Choose a new password for your marketplace account."
      description="Open the recovery link from your inbox, update the password here, and carry on with the same Ex Kitchens account."
      secondaryCta={
        <Link
          href={viewer.user ? "/account" : "/login"}
          className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/82 transition hover:bg-white/10 hover:text-white"
        >
          {viewer.user ? "Back to account" : "Back to login"}
        </Link>
      }
      asideTitle="A reset flow that still feels like the main site."
      asideBody="Changing a password should not look like a disconnected third-party panel. The account flow now stays inside the Ex Kitchens brand from start to finish."
      asidePoints={[
        "Recovery links keep the user on the main Ex Kitchens domain.",
        "Existing marketplace activity stays intact after the reset.",
        "Only the password changes; the account and approval state remain the same.",
      ]}
      form={<ResetPasswordForm />}
    />
  );
}
