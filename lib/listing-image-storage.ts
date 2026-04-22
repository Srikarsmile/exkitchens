import { createAdminClient } from "@/lib/supabase/admin";

export const LISTING_IMAGE_BUCKET = "listing-images";
const LISTING_IMAGE_SIZE_LIMIT = "20MB";
export const MAX_LISTING_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ListingImageUploadDescriptor {
  name: string;
  type?: string | null;
  size?: number | null;
}

export interface ListingImageUploadTarget {
  path: string;
  token: string;
  publicUrl: string;
}

function sanitiseSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fileHasContent(file: FormDataEntryValue | null): file is File {
  return typeof File !== "undefined" && file instanceof File && file.size > 0;
}

function getSafeExtension(file: ListingImageUploadDescriptor) {
  const byName = file.name.split(".").pop()?.toLowerCase().trim();

  if (byName && /^[a-z0-9]{2,8}$/.test(byName)) {
    return byName;
  }

  const byType = file.type?.split("/").pop()?.toLowerCase().trim();

  if (byType === "jpeg") {
    return "jpg";
  }

  if (byType && /^[a-z0-9+.-]{2,12}$/.test(byType)) {
    return byType.replace(/[^a-z0-9]/g, "");
  }

  return "jpg";
}

async function ensureListingImageBucket() {
  const supabase = createAdminClient();
  const bucket = await supabase.storage.getBucket(LISTING_IMAGE_BUCKET);

  if (bucket.error) {
    const created = await supabase.storage.createBucket(LISTING_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: LISTING_IMAGE_SIZE_LIMIT,
      allowedMimeTypes: ["image/*"],
    });

    if (created.error) {
      const duplicate =
        created.error.message.toLowerCase().includes("already exists") ||
        created.error.message.toLowerCase().includes("duplicate");

      if (!duplicate) {
        throw created.error;
      }
    }

    return;
  }

  if (!bucket.data.public) {
    const updated = await supabase.storage.updateBucket(LISTING_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: LISTING_IMAGE_SIZE_LIMIT,
      allowedMimeTypes: ["image/*"],
    });

    if (updated.error) {
      throw updated.error;
    }
  }
}

function assertValidListingImageDescriptor(file: ListingImageUploadDescriptor) {
  if (!file.type?.startsWith("image/")) {
    throw new Error(`${file.name || "File"} is not an image.`);
  }

  if (typeof file.size === "number" && file.size > MAX_LISTING_IMAGE_BYTES) {
    throw new Error(`${file.name || "Image"} is larger than 20MB.`);
  }
}

function createListingImageObjectPath({
  listingSlug,
  kind,
  index,
  file,
}: {
  listingSlug: string;
  kind: "hero" | "gallery";
  index: number;
  file: ListingImageUploadDescriptor;
}) {
  assertValidListingImageDescriptor(file);
  const safeListingSlug = sanitiseSegment(listingSlug) || "listing";

  const extension = getSafeExtension(file);
  const baseName = sanitiseSegment(file.name.replace(/\.[^.]+$/, "")) || `${kind}-${index + 1}`;
  return `${safeListingSlug}/${Date.now()}-${kind}-${index + 1}-${baseName}.${extension}`;
}

function getListingImagePublicUrl(path: string) {
  const supabase = createAdminClient();
  const { data } = supabase.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function createSignedUploadTarget({
  listingSlug,
  kind,
  index,
  file,
}: {
  listingSlug: string;
  kind: "hero" | "gallery";
  index: number;
  file: ListingImageUploadDescriptor;
}): Promise<ListingImageUploadTarget> {
  const supabase = createAdminClient();
  const path = createListingImageObjectPath({
    listingSlug,
    kind,
    index,
    file,
  });
  const signed = await supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (signed.error || !signed.data) {
    throw signed.error || new Error("Could not prepare image upload.");
  }

  return {
    path,
    token: signed.data.token,
    publicUrl: getListingImagePublicUrl(path),
  };
}

async function uploadImageFile({
  file,
  listingSlug,
  kind,
  index,
}: {
  file: File;
  listingSlug: string;
  kind: "hero" | "gallery";
  index: number;
}) {
  assertValidListingImageDescriptor(file);

  const supabase = createAdminClient();
  const objectPath = createListingImageObjectPath({
    listingSlug,
    kind,
    index,
    file,
  });
  const uploaded = await supabase.storage.from(LISTING_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploaded.error || !uploaded.data) {
    throw uploaded.error || new Error("Image upload failed.");
  }

  return {
    path: uploaded.data.path,
    publicUrl: getListingImagePublicUrl(uploaded.data.path),
  };
}

export function readHeroImageFile(formData: FormData) {
  const file = formData.get("heroImageFile");
  return fileHasContent(file) ? file : null;
}

export function readGalleryImageFiles(formData: FormData) {
  return formData.getAll("galleryImageFiles").filter(fileHasContent);
}

export async function createListingImageUploadTargets({
  listingSlug,
  heroFile,
  galleryFiles,
}: {
  listingSlug: string;
  heroFile: ListingImageUploadDescriptor | null;
  galleryFiles: ListingImageUploadDescriptor[];
}) {
  await ensureListingImageBucket();

  const hero = heroFile
    ? await createSignedUploadTarget({
        listingSlug,
        file: heroFile,
        kind: "hero",
        index: 0,
      })
    : null;

  const gallery = await Promise.all(
    galleryFiles.map((file, index) =>
      createSignedUploadTarget({
        listingSlug,
        file,
        kind: "gallery",
        index,
      }),
    ),
  );

  return { hero, gallery };
}

export async function uploadListingImages({
  listingSlug,
  heroFile,
  galleryFiles,
}: {
  listingSlug: string;
  heroFile: File | null;
  galleryFiles: File[];
}) {
  await ensureListingImageBucket();

  const uploadedPaths: string[] = [];

  try {
    const heroUpload = heroFile
      ? await uploadImageFile({
          file: heroFile,
          listingSlug,
          kind: "hero",
          index: 0,
        })
      : null;

    if (heroUpload) {
      uploadedPaths.push(heroUpload.path);
    }

    const galleryUploads = [];

    for (const [index, file] of galleryFiles.entries()) {
      const upload = await uploadImageFile({
        file,
        listingSlug,
        kind: "gallery",
        index,
      });
      uploadedPaths.push(upload.path);
      galleryUploads.push(upload);
    }

    return {
      heroImageUrl: heroUpload?.publicUrl ?? null,
      galleryImageUrls: galleryUploads.map((item) => item.publicUrl),
      uploadedPaths,
    };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const supabase = createAdminClient();
      await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(uploadedPaths);
    }

    throw error;
  }
}

export async function removeListingImages(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(paths);
}
