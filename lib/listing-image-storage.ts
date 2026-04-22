import { createAdminClient } from "@/lib/supabase/admin";

const LISTING_IMAGE_BUCKET = "listing-images";
const LISTING_IMAGE_SIZE_LIMIT = "20MB";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

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

function getSafeExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase().trim();

  if (byName && /^[a-z0-9]{2,8}$/.test(byName)) {
    return byName;
  }

  const byType = file.type.split("/").pop()?.toLowerCase().trim();

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
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name || "File"} is not an image.`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${file.name || "Image"} is larger than 20MB.`);
  }

  const supabase = createAdminClient();
  const extension = getSafeExtension(file);
  const baseName = sanitiseSegment(file.name.replace(/\.[^.]+$/, "")) || `${kind}-${index + 1}`;
  const objectPath = `${listingSlug}/${Date.now()}-${kind}-${index + 1}-${baseName}.${extension}`;
  const uploaded = await supabase.storage.from(LISTING_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploaded.error || !uploaded.data) {
    throw uploaded.error || new Error("Image upload failed.");
  }

  const { data: publicData } = supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .getPublicUrl(uploaded.data.path);

  return {
    path: uploaded.data.path,
    publicUrl: publicData.publicUrl,
  };
}

export function readHeroImageFile(formData: FormData) {
  const file = formData.get("heroImageFile");
  return fileHasContent(file) ? file : null;
}

export function readGalleryImageFiles(formData: FormData) {
  return formData.getAll("galleryImageFiles").filter(fileHasContent);
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
