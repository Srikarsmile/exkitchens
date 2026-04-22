"use client";

import { useActionState } from "react";
import {
  cancelPendingBuyNowOrderAction,
  type MarketplaceActionState,
} from "@/app/actions/marketplace";
import SubmitButton from "@/app/components/forms/SubmitButton";

const initialState: MarketplaceActionState = {};

interface CancelReservationButtonProps {
  orderId: string;
  listingSlug?: string | null;
  redirectPath: string;
  className?: string;
}

export default function CancelReservationButton({
  orderId,
  listingSlug,
  redirectPath,
  className,
}: CancelReservationButtonProps) {
  const [state, action] = useActionState(
    cancelPendingBuyNowOrderAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="redirectPath" value={redirectPath} />
      {listingSlug ? (
        <input type="hidden" name="listingSlug" value={listingSlug} />
      ) : null}

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
        idleLabel="Release reservation"
        pendingLabel="Releasing..."
        className={
          className ||
          "rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
        }
      />
    </form>
  );
}
