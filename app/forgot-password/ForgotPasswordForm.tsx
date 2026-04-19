"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import SubmitButton from "@/app/components/forms/SubmitButton";

interface ForgotPasswordState {
  message?: string;
  errors?: {
    email?: string[];
  };
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ForgotPasswordState>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();

    if (!email) {
      setState({ errors: { email: ["Enter a valid email address."] } });
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            redirectTo?: string;
            message?: string;
            errors?: ForgotPasswordState["errors"];
          }
        | null;

      if (!response.ok || !result?.ok) {
        setState({
          message: result?.message || "Could not send the reset link. Try again.",
          errors: result?.errors,
        });
        return;
      }

      router.push(result.redirectTo || "/login?resetEmail=1");
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "Could not send the reset link. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Account email
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

      {state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <SubmitButton
        idleLabel="Send reset link"
        pendingLabel="Sending reset link..."
        pendingOverride={pending}
        className="w-full rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
      />

      <p className="text-sm text-gray-500">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-[#3d7a44]">
          Back to login
        </Link>
      </p>
    </form>
  );
}
