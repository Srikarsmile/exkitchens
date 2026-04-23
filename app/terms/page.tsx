import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | ExKitchens",
  description:
    "Terms and conditions for Ex Kitchens, a trading name of ICON KITCHEN DESIGNS LTD.",
};

const sections = [
  {
    title: "Business details",
    body: "This website is operated by Ex Kitchens, a trading name of ICON KITCHEN DESIGNS LTD, registered in England and Wales with company number 12082766 and VAT number GB350707906. Our registered office is 116 Brighton Road, Purley, England, CR8 4DB.",
  },
  {
    title: "Using the marketplace",
    body: "You may contact us about a listing without creating an account. You must create an account with accurate contact details before placing bids or starting secure buy-now checkout. Admin approval may be required before bidding is enabled.",
  },
  {
    title: "Listing information",
    body: "Sizes, appliances, finishes, condition notes, and photographs are provided in good faith. Availability can change quickly, and buyers should confirm installation, transport, and fit before payment is finalised.",
  },
  {
    title: "Auction bids",
    body: "A bid is a binding offer to purchase at the amount shown. Auctions can extend automatically near the closing time. Admins may cancel or close an auction where fraud, data error, duplicate stock, or operational risk makes that necessary.",
  },
  {
    title: "Buy-now checkout",
    body: "Some fixed-price kitchens can be requested through a contact form, and some can be reserved directly through secure buy-now checkout. Starting buy-now checkout reserves the listing and creates an order. Payment, fulfilment timing, delivery, dismantling, and installation are confirmed during settlement.",
  },
  {
    title: "Payments and fulfilment",
    body: "Payment instructions, deadlines, and any reference details are issued through the order workflow. Orders may be cancelled or refunded where stock is unavailable, payment does not complete on time, identity or payment checks fail, or a dispute needs manual review.",
  },
  {
    title: "Account conduct",
    body: "We may suspend bidding, remove listings, or close accounts that submit false information, attempt self-bidding, abuse staff, or interfere with the integrity of the marketplace.",
  },
  {
    title: "Liability and governing law",
    body: "To the fullest extent permitted by law, our liability is limited to the amount paid for the relevant order. These terms are governed by the laws of England and Wales, and disputes will be subject to the courts of England and Wales unless mandatory consumer law says otherwise.",
  },
  {
    title: "Contact",
    body: "For questions about these terms, contact Ex Kitchens at info@exkitchens.com or 07913546586.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-20">
      <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3d7a44]">
          Terms & Conditions
        </p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-gray-900">
          Terms for bidding and checkout
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-500">
          These terms describe how Ex Kitchens handles account access, listings,
          bids, checkout, settlement, and related buyer obligations.
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-medium text-gray-900">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#333]"
          >
            Browse marketplace
          </Link>
          <Link
            href="/privacy"
            className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Privacy policy
          </Link>
        </div>
      </div>
    </main>
  );
}
