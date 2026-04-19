"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { createClient } from "@/lib/supabase/client";

interface ResetPasswordState {
  message?: string;
  errors?: {
    password?: string[];
    confirmPassword?: string[];
  };
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ResetPasswordState>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const errors: ResetPasswordState["errors"] = {};

    if (password.length < 8) {
      errors.password = ["Password must be at least 8 characters."];
    }

    if (confirmPassword.length < 8) {
      errors.confirmPassword = ["Confirm the new password."];
    } else if (password !== confirmPassword) {
      errors.confirmPassword = ["Passwords must match."];
    }

    if (errors.password || errors.confirmPassword) {
      setState({ errors });
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setState({ message: error.message });
        return;
      }

      router.push("/account?passwordUpdated=1");
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "Could not update the password. Try again.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="At least 8 characters"
        />
        {state.errors?.password ? (
          <p className="text-sm text-red-600">{state.errors.password[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-gray-700"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder="Repeat the new password"
        />
        {state.errors?.confirmPassword ? (
          <p className="text-sm text-red-600">{state.errors.confirmPassword[0]}</p>
        ) : null}
      </div>

      {state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <SubmitButton
        idleLabel="Update password"
        pendingLabel="Updating password..."
        pendingOverride={pending}
        className="w-full rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </form>
  );
}
