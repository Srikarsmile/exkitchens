import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import {
  createListingImageUploadTargets,
  MAX_LISTING_IMAGE_BYTES,
  removeListingImages,
} from "@/lib/listing-image-storage";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { isSameOriginRequest } from "@/lib/request-guards";

const uploadFileSchema = z.object({
  name: z.string().trim().min(1, "File name is required."),
  type: z.string().trim().min(1, "File type is required."),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_LISTING_IMAGE_BYTES, "Each image must be 20MB or smaller."),
});

const createUploadTargetsSchema = z.object({
  listingSlug: z.string().trim().min(1, "Listing slug is required."),
  heroFile: uploadFileSchema.nullable().optional(),
  galleryFiles: z.array(uploadFileSchema).max(40).default([]),
});

const cleanupUploadsSchema = z.object({
  paths: z.array(z.string().trim().min(1)).max(80),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function requireAdminJson() {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return jsonError("Supabase admin storage is not configured.", 503);
  }

  const viewer = await getViewer();

  if (!viewer.user) {
    return jsonError("You must be signed in.", 401);
  }

  if (viewer.profile?.role !== "admin") {
    return jsonError("Admin access is required.", 403);
  }

  return null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.url, request.headers)) {
    return jsonError("Invalid request origin.", 403);
  }

  const authError = await requireAdminJson();

  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null);
  const parsed = createUploadTargetsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid upload request.", 400);
  }

  try {
    const targets = await createListingImageUploadTargets({
      listingSlug: parsed.data.listingSlug,
      heroFile: parsed.data.heroFile ?? null,
      galleryFiles: parsed.data.galleryFiles,
    });

    return NextResponse.json({
      ok: true,
      hero: targets.hero,
      gallery: targets.gallery,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not prepare image upload.",
      400,
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request.url, request.headers)) {
    return jsonError("Invalid request origin.", 403);
  }

  const authError = await requireAdminJson();

  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null);
  const parsed = cleanupUploadsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid cleanup request.", 400);
  }

  await removeListingImages(parsed.data.paths);
  return NextResponse.json({ ok: true });
}
