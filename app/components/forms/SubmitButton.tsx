"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  pendingOverride?: boolean;
}

export default function SubmitButton({
  idleLabel,
  pendingLabel,
  className,
  pendingOverride,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isPending = pendingOverride ?? pending;

  return (
    <button
      type="submit"
      disabled={isPending}
      className={className}
    >
      {isPending ? pendingLabel : idleLabel}
    </button>
  );
}
