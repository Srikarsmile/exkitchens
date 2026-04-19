"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import SubmitButton from "@/app/components/forms/SubmitButton";

interface RegisterState {
  message?: string;
  errors?: {
    fullName?: string[];
    phone?: string[];
    email?: string[];
    password?: string[];
  };
}

export default function RegisterForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<RegisterState>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const honeypot = String(formData.get("companyWebsite") || "").trim();
    const errors: RegisterState["errors"] = {};

    if (fullName.length < 2) {
      errors.fullName = ["Enter your full name."];
    }

    if (phone.length < 7) {
      errors.phone = ["Enter a phone number."];
    } else if (phone.length > 32) {
      errors.phone = ["Phone number is too long."];
    }

    if (!email) {
      errors.email = ["Enter a valid email address."];
    }

    if (password.length < 8) {
      errors.password = ["Password must be at least 8 characters."];
    }

    if (errors.fullName || errors.phone || errors.email || errors.password) {
      setState({ errors });
      setPending(false);
      return;
    }

    if (honeypot) {
      router.push(`/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`);
      router.refresh();
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          password,
          next: nextPath,
          companyWebsite: honeypot,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            redirectTo?: string;
            message?: string;
            errors?: RegisterState["errors"];
          }
        | null;

      if (!response.ok || !result?.ok) {
        setState({
          message: result?.message || "Could not create the account. Try again.",
          errors: result?.errors,
        });
        return;
      }

      router.push(
        result.redirectTo || `/login?checkEmail=1&next=${encodeURIComponent(nextPath)}`,
      );
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "Could not create the account. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="companyWebsite">Company website</label>
        <input
          id="companyWebsite"
          name="companyWebsite"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="Jane Smith"
        />
        {state.errors?.fullName ? (
          <p className="text-sm text-red-600">{state.errors.fullName[0]}</p>
        ) : null}
      </div>

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
        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="+44 7700 900123"
        />
        {state.errors?.phone ? (
          <p className="text-sm text-red-600">{state.errors.phone[0]}</p>
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
        idleLabel="Create Account"
        pendingLabel="Creating Account..."
        pendingOverride={pending}
        className="w-full rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f6135] disabled:cursor-not-allowed disabled:opacity-70"
      />

      <p className="text-sm text-gray-500">
        You&apos;ll receive an Ex Kitchens verification email before the account
        goes live.
      </p>

      <p className="text-sm text-gray-500">
        Already registered?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-[#3d7a44]"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
