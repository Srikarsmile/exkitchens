import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthPageShell from "@/app/components/AuthPageShell";
import RegisterForm from "@/app/register/RegisterForm";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Register | ExKitchens",
  robots: {
    index: false,
    follow: false,
  },
};

interface RegisterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/marketplace";
  const viewer = await getViewer();

  if (viewer.user) {
    redirect(nextPath);
  }

  return (
    <AuthPageShell
      eyebrow="Buyer Registration"
      title="Create your Ex Kitchens buyer account."
      description="Confirm your email, add the right contact details, and keep saved listings and order updates in one place."
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
          href="/login"
          className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/82 transition hover:bg-white/10 hover:text-white"
        >
          Already have an account?
        </Link>
      }
      notices={
        !isSupabaseConfigured() ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add Supabase environment variables before using auth.
          </p>
        ) : undefined
      }
      asideTitle="A proper buyer account starts with a verified inbox."
      asideBody="New registrations now support branded verification and welcome emails, so the account flow feels like Ex Kitchens from the first click."
      asidePoints={[
        "Email verification happens before the account is considered ready.",
        "Saved listings and order updates stay tied to the verified account.",
        "Basic spam traps stop low-quality automated registrations before they land.",
      ]}
      form={<RegisterForm nextPath={nextPath} />}
    />
  );
}
