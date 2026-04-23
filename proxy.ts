import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/request-guards";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps =
    request.nextUrl.protocol === "https:" || forwardedProto === "https";

  if (!["GET", "HEAD"].includes(request.method)) {
    const response = applySecurityHeaders(NextResponse.next({ request }));

    if (isHttps) {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }

    return response;
  }

  const response = applySecurityHeaders(await updateSession(request));

  if (isHttps) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
