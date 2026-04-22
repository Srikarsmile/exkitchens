import LoadingBlock from "@/app/components/LoadingBlock";

export default function MarketplaceLoading() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <section className="overflow-hidden rounded-[2rem] bg-[#111111] px-6 py-10 md:px-10 md:py-12">
        <div className="max-w-3xl space-y-4">
          <LoadingBlock className="h-4 w-28 bg-white/15" />
          <LoadingBlock className="h-14 w-full max-w-2xl bg-white/12" />
          <LoadingBlock className="h-6 w-full max-w-3xl bg-white/10" />
          <div className="flex flex-wrap gap-3 pt-4">
            <LoadingBlock className="h-11 w-28 bg-white/12" />
            <LoadingBlock className="h-11 w-32 bg-white/12" />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_60px_rgba(17,17,17,0.06)]"
          >
            <LoadingBlock className="h-72 rounded-none" />
            <div className="space-y-4 p-6">
              <LoadingBlock className="h-4 w-24" />
              <LoadingBlock className="h-8 w-3/4" />
              <LoadingBlock className="h-4 w-full" />
              <LoadingBlock className="h-4 w-11/12" />
              <div className="flex gap-2 pt-2">
                <LoadingBlock className="h-8 w-20 rounded-full" />
                <LoadingBlock className="h-8 w-24 rounded-full" />
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-2">
                  <LoadingBlock className="h-3 w-20" />
                  <LoadingBlock className="h-8 w-28" />
                </div>
                <LoadingBlock className="h-11 w-28 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
