import LoadingBlock from "@/app/components/LoadingBlock";

export default function ListingLoading() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="space-y-8">
        <LoadingBlock className="h-5 w-36 rounded-full" />

        <section className="space-y-4">
          <LoadingBlock className="min-h-[320px] w-full md:min-h-[420px] lg:h-[560px]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingBlock key={index} className="h-44 w-full" />
            ))}
          </div>
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <LoadingBlock className="h-10 w-32 rounded-full" />
                <LoadingBlock className="h-10 w-28 rounded-full" />
              </div>
              <LoadingBlock className="h-14 w-full max-w-2xl" />
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              <div className="grid gap-6 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <LoadingBlock className="h-3 w-20" />
                    <LoadingBlock className="h-7 w-24" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              <LoadingBlock className="h-7 w-40" />
              <div className="mt-5 space-y-3">
                <LoadingBlock className="h-4 w-full" />
                <LoadingBlock className="h-4 w-full" />
                <LoadingBlock className="h-4 w-5/6" />
                <LoadingBlock className="h-4 w-4/5" />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              <LoadingBlock className="h-8 w-40" />
              <LoadingBlock className="mt-4 h-4 w-full" />
              <LoadingBlock className="mt-2 h-4 w-5/6" />
              <LoadingBlock className="mt-6 h-12 w-full rounded-full" />
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
              <LoadingBlock className="h-8 w-36" />
              <LoadingBlock className="mt-4 h-4 w-32" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
