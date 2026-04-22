interface RemoteImagePattern {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
}

function normaliseUrl(input?: string | null) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function patternKey(pattern: RemoteImagePattern) {
  return [
    pattern.protocol,
    pattern.hostname,
    pattern.port ?? "",
    pattern.pathname ?? "",
  ].join("|");
}

function buildPattern(url: URL, pathname = "/**"): RemoteImagePattern {
  return {
    protocol: url.protocol === "http:" ? "http" : "https",
    hostname: url.hostname,
    ...(url.port ? { port: url.port } : {}),
    pathname,
  };
}

export function getAllowedListingImageHosts(env = process.env) {
  const patterns = new Map<string, RemoteImagePattern>();
  const addPattern = (url: URL | null, pathname?: string) => {
    if (!url) {
      return;
    }

    const pattern = buildPattern(url, pathname);
    patterns.set(patternKey(pattern), pattern);
  };

  addPattern(normaliseUrl(env.NEXT_PUBLIC_SITE_URL));
  addPattern(normaliseUrl(env.SITE_URL));
  addPattern(normaliseUrl(env.VERCEL_PROJECT_PRODUCTION_URL));
  addPattern(normaliseUrl(env.VERCEL_URL));
  addPattern(normaliseUrl(env.NEXT_PUBLIC_SUPABASE_URL), "/storage/v1/object/public/**");

  return Array.from(patterns.values());
}

export function isAllowedListingImageUrl(value: string, env = process.env) {
  if (value.startsWith("/")) {
    return true;
  }

  const candidate = normaliseUrl(value);

  if (!candidate) {
    return false;
  }

  return getAllowedListingImageHosts(env).some((pattern) => {
    if (pattern.protocol !== (candidate.protocol === "http:" ? "http" : "https")) {
      return false;
    }

    if (pattern.hostname !== candidate.hostname) {
      return false;
    }

    if ((pattern.port ?? "") !== candidate.port) {
      return false;
    }

    if (!pattern.pathname || pattern.pathname === "/**") {
      return true;
    }

    const prefix = pattern.pathname.replace(/\/\*\*$/, "");
    return candidate.pathname.startsWith(prefix);
  });
}

export function getListingImageHostPolicyMessage() {
  return "Hosted image URLs must come from this site or the configured Supabase storage bucket.";
}
