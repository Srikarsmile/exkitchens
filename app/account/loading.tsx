import LoadingBlock from "@/app/components/LoadingBlock";

export default function AccountLoading() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.06)] md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <LoadingBlock className="h-4 w-20" />
            <LoadingBlock className="h-12 w-72 max-w-full" />
            <LoadingBlock className="h-5 w-60 max-w-full" />
            <div className="flex flex-wrap gap-3">
              <LoadingBlock className="h-9 w-20 rounded-full" />
              <LoadingBlock className="h-9 w-28 rounded-full" />
              <LoadingBlock className="h-9 w-32 rounded-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <LoadingBlock className="h-11 w-40 rounded-full" />
            <LoadingBlock className="h-11 w-28 rounded-full" />
            <LoadingBlock className="h-11 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
          >
            <LoadingBlock className="h-4 w-28" />
            <LoadingBlock className="mt-4 h-9 w-12" />
            <LoadingBlock className="mt-3 h-4 w-full" />
            <LoadingBlock className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <LoadingBlock className="h-8 w-52" />
        <LoadingBlock className="mt-3 h-4 w-72 max-w-full" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-4"
            >
              <LoadingBlock className="h-5 w-52 max-w-full" />
              <LoadingBlock className="mt-3 h-4 w-full" />
              <LoadingBlock className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
