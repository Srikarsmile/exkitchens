"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { createClient } from "@/lib/supabase/client";

interface LoginState {
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
  };
}

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<LoginState>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const errors: LoginState["errors"] = {};

    if (!email) {
      errors.email = ["Enter a valid email address."];
    }

    if (password.length < 8) {
      errors.password = ["Password must be at least 8 characters."];
    }

    if (errors.email || errors.password) {
      setState({ errors });
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState({ message: error.message });
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error ? error.message : "Could not sign in. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="you@example.com"
        />
        {state.errors?.email ? (
          <p className="text-sm text-red-600">{state.errors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="At least 8 characters"
        />
        {state.errors?.password ? (
          <p className="text-sm text-red-600">{state.errors.password[0]}</p>
        ) : null}
      </div>

      {state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <SubmitButton
        idleLabel="Sign In"
        pendingLabel="Signing In..."
        pendingOverride={pending}
        className="w-full rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
      />

      <p className="text-sm text-gray-500">
        Forgot your password?{" "}
        <Link href="/forgot-password" className="font-medium text-[#3d7a44]">
          Reset it
        </Link>
      </p>

      <p className="text-sm text-gray-500">
        Need an account?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-[#3d7a44]"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
