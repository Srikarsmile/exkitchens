"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  submitListingInterestAction,
  type MarketplaceActionState,
} from "@/app/actions/marketplace";
import SubmitButton from "@/app/components/forms/SubmitButton";

const initialState: MarketplaceActionState = {};

interface ListingInterestCardProps {
  listingId: string;
  slug: string;
  title: string;
  supportPhone: string;
  supportPhoneHref: string;
  contactEmail: string;
  contactEmailHref: string;
}

export default function ListingInterestCard({
  listingId,
  slug,
  title,
  supportPhone,
  supportPhoneHref,
  contactEmail,
  contactEmailHref,
}: ListingInterestCardProps) {
  const [state, action] = useActionState(
    submitListingInterestAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAtInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renderedAtInputRef.current) {
      renderedAtInputRef.current.value = String(Date.now());
    }
  }, []);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();

      if (renderedAtInputRef.current) {
        renderedAtInputRef.current.value = String(Date.now());
      }
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={slug} />
      <input
        ref={renderedAtInputRef}
        type="hidden"
        name="renderedAt"
        defaultValue=""
      />
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        className="hidden"
        aria-hidden="true"
      />

      <div>
        <h2 className="text-xl font-medium text-gray-900">
          Request this kitchen
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Leave your contact details and Ex Kitchens will call or email you
          about {title}, pricing, availability, and any delivery or installation
          quote.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#3d7a44]">
          No account required
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          Full name
          <input
            name="fullName"
            required
            autoComplete="name"
            className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            placeholder="Your name"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Phone
          <input
            name="phone"
            required
            type="tel"
            autoComplete="tel"
            className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            placeholder="07913 546586"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Email
          <input
            name="email"
            required
            type="email"
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            placeholder="you@example.com"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Notes
          <textarea
            name="note"
            rows={4}
            className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            placeholder="Tell us your preferred timing, postcode, or any questions about the kitchen."
          />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-[#dfe5df] bg-[#f7faf7] px-4 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          name="requestServices"
          className="mt-1 h-4 w-4 accent-[#3d7a44]"
        />
        <span>
          I would like a quote for dismantling, delivery, or installation as
          part of this enquiry.
        </span>
      </label>

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
        idleLabel="Send my details"
        pendingLabel="Sending details..."
        className="w-full rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
      />

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-sm leading-6 text-gray-500">
          Prefer to speak to someone straight away?
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={supportPhoneHref}
            className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Call us on {supportPhone}
          </a>
          <a
            href={contactEmailHref}
            className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Email {contactEmail}
          </a>
        </div>
      </div>
    </form>
  );
}
