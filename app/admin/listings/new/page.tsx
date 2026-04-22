import Link from "next/link";
import AdminCreateListingForm from "@/app/admin/AdminCreateListingForm";
import { requireAdmin } from "@/lib/auth";
import { getSellerOptions } from "@/lib/admin";
import type { SellerOption } from "@/lib/marketplace-shared";

function formatProfileLabel(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName && email) {
    return `${fullName} (${email})`;
  }

  return fullName || email || "Current admin";
}

function getDefaultSellerProfileId(
  sellerOptions: SellerOption[],
  currentAdminProfileId: string,
) {
  const nonCurrentOptions = sellerOptions.filter(
    (seller) => seller.id !== currentAdminProfileId,
  );
  const marketplaceSeller = nonCurrentOptions.find(
    (seller) =>
      /info@exkitchens\.com/i.test(seller.label) ||
      /^ex kitchens\b/i.test(seller.label) ||
      seller.role === "seller",
  );

  return marketplaceSeller?.id || nonCurrentOptions[0]?.id || currentAdminProfileId;
}

export default async function AdminNewListingPage() {
  const viewer = await requireAdmin("/admin/listings/new");
  const sellerOptions = await getSellerOptions();
  const currentAdminLabel = formatProfileLabel(
    viewer.profile?.full_name,
    viewer.profile?.email || viewer.user.email,
  );
  const defaultSellerProfileId = getDefaultSellerProfileId(
    sellerOptions,
    viewer.user.id,
  );

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-6">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-medium text-[#3d7a44] transition hover:text-[#2f6135]"
        >
          ← Back to admin
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3d7a44]">
              New Listing
            </p>
            <h1 className="mt-3 text-4xl font-light tracking-tight text-gray-900">
              Publish a kitchen with direct image upload
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
              Upload the photos straight from your phone or computer, then fill the
              sale details and push the listing live from one place.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin#listings"
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              View live stock
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
            >
              View marketplace
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "1. Choose the photos",
              body: "Start with the hero image and gallery shots directly from your device. No manual hosting step is needed.",
            },
            {
              title: "2. Add the details",
              body: "Use the summary for card text and the description for appliances, units, finishes, dimensions, and extras.",
            },
            {
              title: "3. Pick the sale route",
              body: "Choose auction or buy now, fill the pricing, and add an auction window only when the listing should take bids.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
            >
              <h2 className="text-lg font-medium text-gray-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
          <AdminCreateListingForm
            sellerOptions={sellerOptions}
            currentAdminProfileId={viewer.user.id}
            currentAdminLabel={currentAdminLabel}
            defaultSellerProfileId={defaultSellerProfileId}
          />
        </section>
      </div>
    </main>
  );
}
