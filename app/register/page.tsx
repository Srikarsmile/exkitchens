import Link from "next/link";
import { redirect } from "next/navigation";
import AuthPageShell from "@/app/components/AuthPageShell";
import RegisterForm from "@/app/register/RegisterForm";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

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
      title="Create your Ex Kitchens account before the next auction opens."
      description="Every bidder starts in review. Confirm your email, add the right contact details, and keep the account ready for approval."
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
      asideTitle="A proper bidder account starts with a verified inbox."
      asideBody="New registrations now support branded verification and welcome emails, so the account flow feels like Ex Kitchens from the first click."
      asidePoints={[
        "Email verification happens before the account is considered ready.",
        "Bidder approval still stays under admin control after signup.",
        "Basic spam traps stop low-quality automated registrations before they land.",
      ]}
      form={<RegisterForm nextPath={nextPath} />}
    />
  );
}
