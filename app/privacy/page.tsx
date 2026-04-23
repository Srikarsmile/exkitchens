import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ExKitchens",
  description:
    "Privacy policy for Ex Kitchens, a trading name of ICON KITCHEN DESIGNS LTD.",
};

const sections = [
  {
    title: "Who we are",
    body: "Ex Kitchens is a trading name of ICON KITCHEN DESIGNS LTD, registered in England and Wales with company number 12082766 and VAT number GB350707906. Our registered office is 116 Brighton Road, Purley, England, CR8 4DB.",
  },
  {
    title: "Information we collect",
    body: "We collect account details such as name, email address, phone number, bidder approval state, bids, watchlist entries, notifications, order history, and any information you send when you contact us about listings, delivery, dismantling, installation, or buy-now availability. This includes anonymous listing enquiries submitted without an account.",
  },
  {
    title: "Why we use it",
    body: "We use this information to verify bidders, operate auctions, manage checkout, process payments, respond to listing enquiries, communicate updates, prevent abuse, comply with legal and tax obligations, and maintain an audit trail for marketplace activity.",
  },
  {
    title: "Payments and service providers",
    body: "We use service providers to run the marketplace, including website hosting, authentication, database, email, and payment processing providers. Payment details required for checkout may be processed by Stripe or other payment partners rather than stored directly by us.",
  },
  {
    title: "Who can see it",
    body: "Public pages show listing information and a limited bid feed. Admins can review user, listing, bid, order, and enquiry records for operational and fraud-prevention purposes. Buyers and sellers can see their own orders and related notifications.",
  },
  {
    title: "Retention",
    body: "Account, bid, order, and enquiry records may be retained for operational, tax, fraud-prevention, lead-management, and dispute-resolution needs after a listing has ended.",
  },
  {
    title: "Your controls",
    body: "You can sign in to review your saved listings, bids, notifications, and order activity. For correction, access, or deletion requests, contact us using the email address attached to your account.",
  },
  {
    title: "Contact",
    body: "If you have privacy questions or requests, contact Ex Kitchens at info@exkitchens.com or write to ICON KITCHEN DESIGNS LTD, 116 Brighton Road, Purley, England, CR8 4DB.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-20">
      <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3d7a44]">
          Privacy Policy
        </p>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-gray-900">
          Privacy for auctions, orders, and accounts
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-500">
          This page explains how Ex Kitchens handles account, bidding, order,
          and payment-related information.
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
            href="/terms"
            className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Terms of service
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#333]"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
