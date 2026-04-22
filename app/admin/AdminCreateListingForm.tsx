"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { createListingAction, type AdminActionState } from "@/app/actions/admin";
import SubmitButton from "@/app/components/forms/SubmitButton";
import type { SellerOption } from "@/lib/marketplace-shared";

const initialState: AdminActionState = {};

interface AdminCreateListingFormProps {
  sellerOptions: SellerOption[];
}

interface PreviewImage {
  name: string;
  url: string;
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-[1.25rem] border border-[#e5ebe5] bg-[#fcfdfc] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3d7a44]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-medium text-gray-900">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  span = 1,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div className={span === 2 ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint ? <p className="mt-2 text-xs leading-5 text-gray-500">{hint}</p> : null}
    </div>
  );
}

function PreviewGrid({
  items,
  emptyLabel,
}: {
  items: PreviewImage[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={`${item.name}-${item.url}`}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          <div className="aspect-[4/3] bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="px-3 py-2 text-xs text-gray-500">{item.name}</div>
        </div>
      ))}
    </div>
  );
}

function UploadPanel({
  title,
  description,
  inputName,
  multiple = false,
  onChange,
}: {
  title: string;
  description: string;
  inputName: string;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-[1.25rem] border border-dashed border-[#b7c7b7] bg-white px-5 py-6 transition hover:border-[#3d7a44] hover:bg-[#f7faf7]">
      <span className="block text-base font-medium text-gray-900">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-gray-500">{description}</span>
      <span className="mt-4 inline-flex rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white">
        {multiple ? "Choose images" : "Choose image"}
      </span>
      <input
        type="file"
        name={inputName}
        accept="image/*"
        multiple={multiple}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );
}

export default function AdminCreateListingForm({
  sellerOptions,
}: AdminCreateListingFormProps) {
  const [state, action] = useActionState(createListingAction, initialState);
  const [saleType, setSaleType] = useState<"auction" | "buy_now">("auction");
  const [heroPreview, setHeroPreview] = useState<PreviewImage[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<PreviewImage[]>([]);
  const [auctionStartsAtOffsetMinutes, setAuctionStartsAtOffsetMinutes] =
    useState("");
  const [auctionEndsAtOffsetMinutes, setAuctionEndsAtOffsetMinutes] = useState("");

  useEffect(() => {
    return () => {
      heroPreview.forEach((item) => URL.revokeObjectURL(item.url));
      galleryPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [galleryPreviews, heroPreview]);

  function handleHeroChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    setHeroPreview((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.url));

      if (!file) {
        return [];
      }

      return [{ name: file.name, url: URL.createObjectURL(file) }];
    });
  }

  function handleGalleryChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || []);

    setGalleryPreviews((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.url));
      return files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
    });
  }

  function getOffsetMinutes(value: string) {
    if (!value) {
      return "";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return String(parsed.getTimezoneOffset());
  }

  return (
    <form action={action} encType="multipart/form-data" className="space-y-8">
      <input
        type="hidden"
        name="auctionStartsAtOffsetMinutes"
        value={auctionStartsAtOffsetMinutes}
      />
      <input
        type="hidden"
        name="auctionEndsAtOffsetMinutes"
        value={auctionEndsAtOffsetMinutes}
      />

      <div className="rounded-[1.5rem] bg-[#111111] px-6 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#afcdb2]">
          New Listing Workflow
        </p>
        <h1 className="mt-3 text-3xl font-light tracking-tight">
          Add a kitchen with uploads from phone or computer
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
          Start by choosing the photos, then fill the commercial details. This page
          now accepts normal image uploads, so you do not need to host the files
          somewhere else first.
        </p>
      </div>

      <Section
        eyebrow="Step 1"
        title="Upload the images"
        description="Choose the main hero image and the gallery shots directly from your phone, tablet, or computer."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <UploadPanel
            title="Hero image"
            description="This is the main image buyers see first on cards and on the listing page."
            inputName="heroImageFile"
            onChange={handleHeroChange}
          />
          <UploadPanel
            title="Gallery images"
            description="Choose multiple images for the listing gallery. The order in your selection is kept."
            inputName="galleryImageFiles"
            multiple
            onChange={handleGalleryChange}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Hero preview</p>
            <PreviewGrid
              items={heroPreview}
              emptyLabel="No hero image selected yet."
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Gallery preview</p>
            <PreviewGrid
              items={galleryPreviews}
              emptyLabel="No gallery images selected yet."
            />
          </div>
        </div>

        <details className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-900">
            Use already hosted image URLs instead
          </summary>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Hero image URL"
              hint="Optional fallback for images already hosted on Ex Kitchens or in your Supabase storage bucket."
            >
              <input
                name="heroImageUrl"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                placeholder="https://..."
              />
            </Field>
            <Field
              label="Gallery image URLs"
              hint="One URL per line. Only Ex Kitchens or Supabase-hosted image URLs are accepted here."
            >
              <textarea
                name="galleryUrls"
                rows={5}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                placeholder={"https://example.com/1.jpg\nhttps://example.com/2.jpg"}
              />
            </Field>
          </div>
        </details>
      </Section>

      <Section
        eyebrow="Step 2"
        title="Write the listing"
        description="Add the buyer-facing copy and basic commercial context."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Title" span={2}>
            <input
              name="title"
              required
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="Rotpunkt matt black handless kitchen"
            />
          </Field>

          <Field label="Slug" hint="Leave blank to generate from the title.">
            <input
              name="slug"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="rotpunkt-matt-black-handless-kitchen"
            />
          </Field>

          <Field label="Brand">
            <input
              name="brand"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="Rotpunkt"
            />
          </Field>

          <Field
            label="Summary"
            span={2}
            hint="This appears in listing cards and the top section of the detail page."
          >
            <textarea
              name="summary"
              required
              rows={3}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="Matt black handless display kitchen with brass rails, Cosentino granite worktops, AEG appliances, and flamed oak island."
            />
          </Field>

          <Field
            label="Description"
            span={2}
            hint="List what is included, appliance details, finishes, measurements, and collection notes."
          >
            <textarea
              name="description"
              rows={8}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="Materials, appliances, dimensions, condition, and included extras."
            />
          </Field>

          <Field label="Location">
            <input
              name="location"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="Purley, London"
            />
          </Field>

          <Field
            label="Seller profile"
            hint="Attach the listing to an existing seller or leave it under the current admin."
          >
            <select
              name="sellerProfileId"
              defaultValue=""
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            >
              <option value="">Use my admin profile</option>
              {sellerOptions.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Tags"
            span={2}
            hint="Comma-separated tags like appliance brand, finish, worktop, island, or handle style."
          >
            <input
              name="tags"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="AEG, granite, island, brass rails"
            />
          </Field>
        </div>
      </Section>

      <Section
        eyebrow="Step 3"
        title="Choose the sale setup"
        description="Pick whether the kitchen is auction-only or buy-now, then fill the pricing fields that apply."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Sale type"
            hint="Auction shows bidding and timing fields. Buy now keeps the form shorter."
          >
            <select
              name="saleType"
              value={saleType}
              onChange={(event) =>
                setSaleType(event.currentTarget.value as "auction" | "buy_now")
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            >
              <option value="auction">Auction</option>
              <option value="buy_now">Buy now</option>
            </select>
          </Field>

          <Field label="Original price (GBP)" hint="Optional showroom or RRP reference.">
            <input
              name="originalPrice"
              type="number"
              min="0"
              step="1"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="43450"
            />
          </Field>

          {saleType === "buy_now" ? (
            <Field label="Buy now price (GBP)" span={2}>
              <input
                name="buyNowPrice"
                type="number"
                min="0"
                step="1"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                placeholder="21500"
              />
            </Field>
          ) : (
            <>
              <Field label="Starting bid (GBP)">
                <input
                  name="startingBid"
                  type="number"
                  min="0"
                  step="1"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                  placeholder="9500"
                />
              </Field>

              <Field label="Bid increment (GBP)">
                <input
                  name="bidIncrement"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue="50"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                />
              </Field>

              <Field label="Reserve price (GBP)">
                <input
                  name="reservePrice"
                  type="number"
                  min="1"
                  step="1"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                  placeholder="12000"
                />
              </Field>

              <Field
                label="Feature on homepage"
                hint="Featured listings appear in homepage highlights."
              >
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="featured"
                    className="h-4 w-4 accent-[#3d7a44]"
                  />
                  Show in featured sections
                </label>
              </Field>

              <Field label="Auction start">
                <input
                  name="auctionStartsAt"
                  type="datetime-local"
                  onChange={(event) =>
                    setAuctionStartsAtOffsetMinutes(
                      getOffsetMinutes(event.currentTarget.value),
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                />
              </Field>

              <Field
                label="Auction end"
                hint="These times are saved in your local timezone, including daylight-saving changes."
              >
                <input
                  name="auctionEndsAt"
                  type="datetime-local"
                  onChange={(event) =>
                    setAuctionEndsAtOffsetMinutes(
                      getOffsetMinutes(event.currentTarget.value),
                    )
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
                />
              </Field>
            </>
          )}

          {saleType === "buy_now" ? (
            <>
              <Field
                label="Feature on homepage"
                hint="Featured listings appear in homepage highlights."
              >
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="featured"
                    className="h-4 w-4 accent-[#3d7a44]"
                  />
                  Show in featured sections
                </label>
              </Field>
              <div className="hidden md:block" />
            </>
          ) : null}
        </div>
      </Section>

      {state.message ? (
        <div
          className={`rounded-[1.25rem] px-5 py-4 text-sm ${
            state.success
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p>{state.message}</p>
          {state.success && state.listingSlug ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href={`/marketplace/${state.listingSlug}`}
                className="font-medium text-[#2f6135] underline underline-offset-2"
              >
                Open listing
              </Link>
              <Link
                href="/admin"
                className="font-medium text-[#2f6135] underline underline-offset-2"
              >
                Back to admin
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(17,17,17,0.05)]">
        <div>
          <p className="text-sm font-medium text-gray-900">Ready to publish</p>
          <p className="mt-1 text-sm text-gray-500">
            The listing goes live as soon as the form completes successfully.
          </p>
        </div>
        <SubmitButton
          idleLabel="Create listing"
          pendingLabel="Uploading and creating..."
          className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
