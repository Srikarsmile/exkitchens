const LISTING_IMAGE_VERSION = "20260422";
const SUPABASE_LISTING_OBJECT_PREFIX = "/storage/v1/object/public/listing-images/";
const SUPABASE_LISTING_RENDER_PREFIX = "/storage/v1/render/image/public/listing-images/";

function parseRemoteUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isSupabaseListingImageUrl(value: string) {
  const url = parseRemoteUrl(value);

  if (!url) {
    return false;
  }

  return url.pathname.startsWith(SUPABASE_LISTING_OBJECT_PREFIX);
}

export function withListingImageVersion(value: string) {
  if (!isSupabaseListingImageUrl(value)) {
    return value;
  }

  const url = parseRemoteUrl(value);

  if (!url) {
    return value;
  }

  url.searchParams.set("v", LISTING_IMAGE_VERSION);
  return url.href;
}

export function getSupabaseListingRenderUrl(
  value: string,
  { width, quality }: { width: number; quality?: number },
) {
  const versionedValue = withListingImageVersion(value);
  const url = parseRemoteUrl(versionedValue);

  if (!url || !url.pathname.startsWith(SUPABASE_LISTING_OBJECT_PREFIX)) {
    return versionedValue;
  }

  url.pathname = url.pathname.replace(
    SUPABASE_LISTING_OBJECT_PREFIX,
    SUPABASE_LISTING_RENDER_PREFIX,
  );
  url.searchParams.set("width", Math.max(1, Math.round(width)).toString());
  url.searchParams.set("quality", (quality ?? 75).toString());
  return url.href;
}
