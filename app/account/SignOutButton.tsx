"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
