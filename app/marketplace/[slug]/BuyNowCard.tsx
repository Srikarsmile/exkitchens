"use client";

import { useActionState } from "react";
import {
  createBuyNowOrderAction,
  type MarketplaceActionState,
} from "@/app/actions/marketplace";
import { formatMoney } from "@/lib/marketplace-shared";
import SubmitButton from "@/app/components/forms/SubmitButton";

const initialState: MarketplaceActionState = {};

interface BuyNowCardProps {
  listingId: string;
  slug: string;
  amountPence: number | null;
}

export default function BuyNowCard({
  listingId,
  slug,
  amountPence,
}: BuyNowCardProps) {
  const [state, action] = useActionState(createBuyNowOrderAction, initialState);

  return (
    <form
      action={action}
      className="space-y-4 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <h2 className="text-xl font-medium text-gray-900">Buy now</h2>
        <p className="mt-2 text-sm text-gray-500">
          Reserve this kitchen for {formatMoney(amountPence)} and move payment into
          your account workflow.
        </p>
      </div>

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
        idleLabel="Start checkout"
        pendingLabel="Starting checkout..."
        className="w-full rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </form>
  );
}
