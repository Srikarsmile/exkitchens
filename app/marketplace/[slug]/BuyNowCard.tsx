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
  supportPhone: string;
  supportPhoneHref: string;
}

export default function BuyNowCard({
  listingId,
  slug,
  amountPence,
  supportPhone,
  supportPhoneHref,
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
          Reserve this kitchen for {formatMoney(amountPence)} and complete the
          next step straight away. Your order stays visible in your account after
          payment.
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
        idleLabel="Buy now"
        pendingLabel="Opening checkout..."
        className="w-full rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
      />

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-sm leading-6 text-gray-500">
          If you still have questions about this kitchen, call us.
        </p>
        <a
          href={supportPhoneHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
        >
          Call us on {supportPhone}
        </a>
      </div>
    </form>
  );
}
