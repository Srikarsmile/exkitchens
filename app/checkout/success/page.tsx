import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isSupabaseAdminConfigured } from "@/lib/env";
import {
  formatMoney,
  formatOrderStatus,
  type OrderStatus,
} from "@/lib/marketplace-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCheckoutSession } from "@/lib/stripe";

interface CheckoutSuccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface SuccessOrderSummary {
  id: string;
  status: OrderStatus;
  amountPence: number;
  listingTitle: string | null;
  listingSlug: string | null;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const [{ user }, params] = await Promise.all([
    requireUser("/login"),
    searchParams,
  ]);
  const sessionId =
    typeof params.session_id === "string" ? params.session_id.trim() : "";
  const summary = sessionId
    ? await getCheckoutSuccessSummary(user.id, sessionId)
    : null;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-4xl items-center px-6 py-12">
      <section className="w-full rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3d7a44]">
          Checkout complete
        </p>
        <h1 className="mt-4 text-4xl font-light tracking-tight text-gray-900">
          Payment received
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
          Your payment has been received. We have emailed the confirmation details and
          your order is now visible in your account.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Listing"
            value={summary?.listingTitle || "Ex Kitchens order"}
          />
          <SummaryCard
            label="Amount"
            value={formatMoney(summary?.amountPence ?? null)}
          />
          <SummaryCard
            label="Status"
            value={formatOrderStatus(summary?.status ?? "paid")}
          />
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-[#dfe5df] bg-[#f7faf7] p-6">
          <p className="text-sm font-medium text-gray-900">What happens next</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
            <li>We have confirmed the card payment and reserved the kitchen for you.</li>
            <li>Our team will follow up with collection and handover details.</li>
            <li>Your account order history will keep the payment reference and status.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/account"
            className="rounded-full bg-[#111111] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
          >
            Open account
          </Link>
          {summary?.listingSlug ? (
            <Link
              href={`/marketplace/${summary.listingSlug}`}
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              View listing
            </Link>
          ) : null}
          <Link
            href="/marketplace"
            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Back to marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[#fafafa] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-lg font-medium text-gray-900">{value}</p>
    </div>
  );
}

async function getCheckoutSuccessSummary(userId: string, sessionId: string) {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  try {
    const session = await getCheckoutSession(sessionId);
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      return null;
    }

    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, status, amount_pence, buyer_profile_id, listings!orders_listing_id_fkey(title, slug)",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order || order.buyer_profile_id !== userId) {
      return null;
    }

    const listing = Array.isArray(order.listings) ? order.listings[0] : order.listings;

    return {
      id: order.id,
      status: order.status,
      amountPence: order.amount_pence,
      listingTitle: listing?.title ?? null,
      listingSlug: listing?.slug ?? null,
    } satisfies SuccessOrderSummary;
  } catch (error) {
    console.error("Failed to load checkout success summary", error);
    return null;
  }
}
