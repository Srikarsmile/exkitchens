"use client";

import { useActionState } from "react";
import {
  startOrderCheckoutAction,
  type MarketplaceActionState,
} from "@/app/actions/marketplace";
import SubmitButton from "@/app/components/forms/SubmitButton";

const initialState: MarketplaceActionState = {};

interface OrderCheckoutButtonProps {
  orderId: string;
  className?: string;
}

export default function OrderCheckoutButton({
  orderId,
  className,
}: OrderCheckoutButtonProps) {
  const [state, action] = useActionState(startOrderCheckoutAction, initialState);

  return (
    <form action={action} className={className || "space-y-3"}>
      <input type="hidden" name="orderId" value={orderId} />
      {state.message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.success
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton
        idleLabel="Pay securely"
        pendingLabel="Redirecting..."
        className="rounded-full bg-[#3d7a44] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2f6135] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </form>
  );
}
