"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  createListingAction,
  type AdminActionState,
} from "@/app/actions/admin";
import SubmitButton from "@/app/components/forms/SubmitButton";
import type { SellerOption } from "@/lib/marketplace-shared";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const initialState: AdminActionState = {};
const LISTING_IMAGE_BUCKET = "listing-images";

interface AdminCreateListingFormProps {
  sellerOptions: SellerOption[];
  currentAdminProfileId: string;
  currentAdminLabel: string;
  defaultSellerProfileId: string;
}

interface PreviewImage {
  name: string;
  url: string;
}

interface ListingImageUploadFile {
  name: string;
  type: string;
  size: number;
}

interface ListingImageUploadTarget {
  path: string;
  token: string;
  publicUrl: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          {description}
        </p>
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
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-gray-500">{hint}</p>
      ) : null}
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
  inputRef,
}: {
  title: string;
  description: string;
  inputName: string;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="block cursor-pointer rounded-[1.25rem] border border-dashed border-[#b7c7b7] bg-white px-5 py-6 transition hover:border-[#3d7a44] hover:bg-[#f7faf7]">
      <span className="block text-base font-medium text-gray-900">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-gray-500">
        {description}
      </span>
      <span className="mt-4 inline-flex rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white">
        {multiple ? "Choose images" : "Choose image"}
      </span>
      <input
        ref={inputRef}
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
  currentAdminProfileId,
  currentAdminLabel,
  defaultSellerProfileId,
}: AdminCreateListingFormProps) {
  const [state, action] = useActionState(createListingAction, initialState);
  const [selectedSellerProfileId, setSelectedSellerProfileId] = useState(
    defaultSellerProfileId,
  );
  const [heroPreview, setHeroPreview] = useState<PreviewImage[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<PreviewImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const uploadedHeroUrlRef = useRef<HTMLInputElement>(null);
  const uploadedGalleryUrlsRef = useRef<HTMLInputElement>(null);
  const uploadedHeroPathRef = useRef<HTMLInputElement>(null);
  const uploadedGalleryPathsRef = useRef<HTMLInputElement>(null);
  const bypassSubmitPreparationRef = useRef(false);
  const isAdminSellerSelection =
    selectedSellerProfileId === currentAdminProfileId;

  useEffect(() => {
    return () => {
      heroPreview.forEach((item) => URL.revokeObjectURL(item.url));
      galleryPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [galleryPreviews, heroPreview]);

  function handleHeroChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    clearUploadedImageFields();
    setUploadError(null);

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
    clearUploadedImageFields();
    setUploadError(null);

    setGalleryPreviews((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.url));
      return files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
    });
  }

  function clearUploadedImageFields() {
    if (uploadedHeroUrlRef.current) {
      uploadedHeroUrlRef.current.value = "";
    }

    if (uploadedGalleryUrlsRef.current) {
      uploadedGalleryUrlsRef.current.value = "";
    }

    if (uploadedHeroPathRef.current) {
      uploadedHeroPathRef.current.value = "";
    }

    if (uploadedGalleryPathsRef.current) {
      uploadedGalleryPathsRef.current.value = "";
    }
  }

  async function cleanupUploadedPaths(paths: string[]) {
    if (paths.length === 0) {
      return;
    }

    await fetch("/api/admin/listing-images", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ paths }),
    }).catch(() => undefined);
  }

  async function prepareDirectUploads() {
    const heroFile = heroInputRef.current?.files?.[0] ?? null;
    const galleryFiles = Array.from(galleryInputRef.current?.files ?? []);

    if (!heroFile && galleryFiles.length === 0) {
      return;
    }

    const form = formRef.current;
    const title = form?.elements.namedItem("title");
    const slugField = form?.elements.namedItem("slug");
    const rawTitle = title instanceof HTMLInputElement ? title.value : "";
    const rawSlug =
      slugField instanceof HTMLInputElement ? slugField.value : "";
    const listingSlug = slugify(rawSlug || rawTitle);

    if (!listingSlug) {
      throw new Error("Add a title before uploading images.");
    }

    const response = await fetch("/api/admin/listing-images", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        listingSlug,
        heroFile: heroFile
          ? {
              name: heroFile.name,
              type: heroFile.type,
              size: heroFile.size,
            }
          : null,
        galleryFiles: galleryFiles.map<ListingImageUploadFile>((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      hero?: ListingImageUploadTarget | null;
      gallery?: ListingImageUploadTarget[];
    } | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "Could not prepare image upload.");
    }

    const supabase = createSupabaseClient();
    const uploadedPaths: string[] = [];

    try {
      if (heroFile) {
        if (!payload.hero) {
          throw new Error("The hero image upload target is missing.");
        }

        const { error } = await supabase.storage
          .from(LISTING_IMAGE_BUCKET)
          .uploadToSignedUrl(payload.hero.path, payload.hero.token, heroFile, {
            cacheControl: "3600",
            contentType: heroFile.type || "application/octet-stream",
          });

        if (error) {
          throw error;
        }

        uploadedPaths.push(payload.hero.path);

        if (uploadedHeroUrlRef.current) {
          uploadedHeroUrlRef.current.value = payload.hero.publicUrl;
        }

        if (uploadedHeroPathRef.current) {
          uploadedHeroPathRef.current.value = payload.hero.path;
        }
      }

      const galleryTargets = payload.gallery ?? [];

      if (galleryTargets.length !== galleryFiles.length) {
        throw new Error(
          "The gallery image upload targets do not match the selected files.",
        );
      }

      for (const [index, file] of galleryFiles.entries()) {
        const target = galleryTargets[index];
        const { error } = await supabase.storage
          .from(LISTING_IMAGE_BUCKET)
          .uploadToSignedUrl(target.path, target.token, file, {
            cacheControl: "3600",
            contentType: file.type || "application/octet-stream",
          });

        if (error) {
          throw error;
        }

        uploadedPaths.push(target.path);
      }

      if (uploadedGalleryUrlsRef.current) {
        uploadedGalleryUrlsRef.current.value = galleryTargets
          .map((target) => target.publicUrl)
          .join("\n");
      }

      if (uploadedGalleryPathsRef.current) {
        uploadedGalleryPathsRef.current.value = galleryTargets
          .map((target) => target.path)
          .join("\n");
      }

      if (heroInputRef.current) {
        heroInputRef.current.value = "";
      }

      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    } catch (error) {
      clearUploadedImageFields();
      await cleanupUploadedPaths(uploadedPaths);
      throw error;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (bypassSubmitPreparationRef.current) {
      bypassSubmitPreparationRef.current = false;
      return;
    }

    event.preventDefault();
    setUploadError(null);
    setIsPreparingUpload(true);

    try {
      await prepareDirectUploads();
      bypassSubmitPreparationRef.current = true;
      formRef.current?.requestSubmit();
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Image upload failed. Try again.",
      );
    } finally {
      setIsPreparingUpload(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      encType="multipart/form-data"
      className="space-y-8"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="saleType" value="buy_now" />
      <input
        ref={uploadedHeroUrlRef}
        type="hidden"
        name="uploadedHeroImageUrl"
      />
      <input
        ref={uploadedGalleryUrlsRef}
        type="hidden"
        name="uploadedGalleryUrls"
      />
      <input
        ref={uploadedHeroPathRef}
        type="hidden"
        name="uploadedHeroImagePath"
      />
      <input
        ref={uploadedGalleryPathsRef}
        type="hidden"
        name="uploadedGalleryPaths"
      />

      <div className="rounded-[1.5rem] bg-[#111111] px-6 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#afcdb2]">
          New Listing Workflow
        </p>
        <h1 className="mt-3 text-3xl font-light tracking-tight">
          Add a kitchen with uploads from phone or computer
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
          Start by choosing the photos, then fill the commercial details. This
          page now accepts normal image uploads, so you do not need to host the
          files somewhere else first.
        </p>
      </div>

      <Section
        eyebrow="Step 1"
        title="Upload the images"
        description="Choose the main hero image and the gallery shots directly from your phone, tablet, or computer. Use clear, well-lit photos and remove clutter before uploading."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <UploadPanel
            title="Hero image"
            description="This is the main image buyers see first on cards and on the listing page."
            inputName="heroImageFile"
            onChange={handleHeroChange}
            inputRef={heroInputRef}
          />
          <UploadPanel
            title="Gallery images"
            description="Choose multiple images for the listing gallery. The order in your selection is kept."
            inputName="galleryImageFiles"
            multiple
            onChange={handleGalleryChange}
            inputRef={galleryInputRef}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Hero preview
            </p>
            <PreviewGrid
              items={heroPreview}
              emptyLabel="No hero image selected yet."
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Gallery preview
            </p>
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
                placeholder={
                  "https://example.com/1.jpg\nhttps://example.com/2.jpg"
                }
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
            label="Condition"
            hint="This controls the public Ex-display or Used badge. You do not need to repeat it in tags."
          >
            <select
              name="condition"
              required
              defaultValue=""
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            >
              <option value="" disabled>
                Select condition
              </option>
              <option value="ex_display">Ex-display</option>
              <option value="used">Used</option>
            </select>
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
            hint="Listings assigned to your own admin profile cannot be purchased from this same account."
          >
            <select
              name="sellerProfileId"
              required
              value={selectedSellerProfileId}
              onChange={(event) =>
                setSelectedSellerProfileId(event.currentTarget.value)
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
            >
              <option value={currentAdminProfileId}>
                Use my admin profile: {currentAdminLabel}
              </option>
              {sellerOptions
                .filter((seller) => seller.id !== currentAdminProfileId)
                .map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.label}
                  </option>
                ))}
            </select>
            <p
              className={`mt-2 text-xs leading-5 ${
                isAdminSellerSelection ? "text-amber-700" : "text-gray-500"
              }`}
            >
              {isAdminSellerSelection
                ? "This listing will belong to your admin account, so this same login will see seller view instead of buy-now checkout."
                : "This listing will stay buyable when you are signed into your admin account, because the seller is a different profile."}
            </p>
          </Field>

          <Field
            label="Tags"
            span={2}
            hint="Comma-separated tags for appliance brand, finish, worktop, island, handle style, or standout details."
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
        title="Set the selling price"
        description="Add the original showroom price and the buy-now price buyers can reserve at today."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#dfe8df] bg-[#f7faf7] px-4 py-3 text-sm text-gray-700 md:col-span-2">
            Listings are temporarily published as buy-now only.
          </div>

          <Field
            label="Original price (GBP)"
            hint="Optional showroom or RRP reference."
          >
            <input
              name="originalPrice"
              type="number"
              min="0"
              step="1"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="43450"
            />
          </Field>

          <Field label="Buy now price (GBP)">
            <input
              name="buyNowPrice"
              type="number"
              min="0"
              step="1"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#3d7a44]"
              placeholder="21500"
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
          <div className="hidden md:block" />
        </div>
      </Section>

      {uploadError ? (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p>{uploadError}</p>
        </div>
      ) : null}

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
          pendingLabel={
            isPreparingUpload ? "Uploading images..." : "Creating listing..."
          }
          className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-70"
          pendingOverride={isPreparingUpload || undefined}
        />
      </div>
    </form>
  );
}
