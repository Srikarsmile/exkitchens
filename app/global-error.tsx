"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Global application error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fafaf7] text-[#111111]">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center px-6 py-16">
          <div className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
              Application Error
            </p>
            <h1 className="mt-4 text-3xl font-light tracking-tight text-gray-900">
              ExKitchens hit an unexpected failure.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600">
              The app could not recover automatically. Retry the request or
              return to the marketplace while the issue is checked.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
              >
                Retry
              </button>
              <Link
                href="/"
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
              >
                Home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
