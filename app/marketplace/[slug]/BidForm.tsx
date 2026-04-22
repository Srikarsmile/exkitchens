"use client";

import { useActionState } from "react";
import { placeBidAction, type BidActionState } from "@/app/actions/bids";
import { formatMoney } from "@/lib/marketplace-shared";
import SubmitButton from "@/app/components/forms/SubmitButton";

const initialState: BidActionState = {};

interface BidFormProps {
  auctionId: string;
  slug: string;
  minimumBidPence: number | null;
  previewOnly?: boolean;
}

export default function BidForm({
  auctionId,
  slug,
  minimumBidPence,
  previewOnly = false,
}: BidFormProps) {
  const [state, action] = useActionState(placeBidAction, initialState);

  return (
    <form
      action={previewOnly ? undefined : action}
      className="space-y-4 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="auctionId" value={auctionId} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <h2 className="text-xl font-medium text-gray-900">
          {previewOnly ? "Bid preview" : "Place a bid"}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Minimum next bid: {formatMoney(minimumBidPence)}
        </p>
      </div>

      {previewOnly ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Admin preview only. This mirrors the live bidding form, but bidding is
          disabled because your account owns this listing as the seller.
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium text-gray-700">
          Your bid (GBP)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={minimumBidPence ? Math.ceil(minimumBidPence / 100) : 1}
          step="1"
          required
          disabled={previewOnly}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
          placeholder={
            minimumBidPence ? String(Math.ceil(minimumBidPence / 100)) : "10000"
          }
        />
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

      {previewOnly ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white opacity-70"
        >
          Preview only
        </button>
      ) : (
        <SubmitButton
          idleLabel="Submit Bid"
          pendingLabel="Submitting Bid..."
          className="w-full rounded-full bg-[#3d7a44] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2f6135] disabled:cursor-not-allowed disabled:opacity-70"
        />
      )}
    </form>
  );
}
