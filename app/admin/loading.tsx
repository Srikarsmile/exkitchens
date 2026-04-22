import LoadingBlock from "@/app/components/LoadingBlock";

export default function AdminLoading() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <LoadingBlock className="h-4 w-16" />
          <LoadingBlock className="h-12 w-96 max-w-full" />
          <LoadingBlock className="h-4 w-full max-w-2xl" />
          <LoadingBlock className="h-4 w-5/6 max-w-xl" />
        </div>
        <div className="flex gap-3">
          <LoadingBlock className="h-11 w-36 rounded-full" />
          <LoadingBlock className="h-11 w-24 rounded-full" />
          <LoadingBlock className="h-11 w-36 rounded-full" />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
          >
            <LoadingBlock className="h-4 w-24" />
            <LoadingBlock className="mt-4 h-10 w-12" />
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(17,17,17,0.05)]"
          >
            <LoadingBlock className="h-7 w-36" />
            <LoadingBlock className="mt-4 h-4 w-full" />
            <LoadingBlock className="mt-2 h-4 w-5/6" />
            <LoadingBlock className="mt-6 h-10 w-28 rounded-full" />
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(17,17,17,0.05)]">
        <LoadingBlock className="h-8 w-48" />
        <LoadingBlock className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-4"
            >
              <LoadingBlock className="h-5 w-44" />
              <LoadingBlock className="mt-3 h-4 w-full" />
              <LoadingBlock className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
