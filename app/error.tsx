"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Route segment failed to render", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-start justify-center px-6 py-16">
      <div className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
          Unexpected Error
        </p>
        <h1 className="mt-4 text-3xl font-light tracking-tight text-gray-900">
          This section could not be loaded.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600">
          The request failed unexpectedly. Retry the segment or return to the
          marketplace while the issue is investigated.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
          >
            Try again
          </button>
          <Link
            href="/marketplace"
            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
          >
            Back to marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
