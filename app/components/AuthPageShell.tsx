import type { ReactNode } from "react";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

interface AuthPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: ReactNode;
  secondaryCta?: ReactNode;
  notices?: ReactNode;
  form: ReactNode;
  asideTitle: string;
  asideBody: string;
  asidePoints: string[];
}

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  notices,
  form,
  asideTitle,
  asideBody,
  asidePoints,
}: AuthPageShellProps) {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <Navbar forceSolid />

      <main id="main-content" className="pt-20">
        <section className="relative min-h-[360px] overflow-hidden bg-[#111111]">
          <Image
            src="/assets/kitchen_nano_ultrawide_2.jpg"
            alt="Ex Kitchens account access"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/55" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(17,17,17,0.84) 0%, rgba(17,17,17,0.48) 50%, rgba(17,17,17,0.6) 100%)",
            }}
          />

          <div className="relative mx-auto flex min-h-[360px] w-full max-w-7xl items-end px-6 py-12 md:px-8 lg:py-16">
            <div className="max-w-2xl space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b4d5b8]">
                {eyebrow}
              </p>
              <h1 className="text-4xl font-light tracking-tight text-white md:text-6xl">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/72 md:text-lg">
                {description}
              </p>
              {(primaryCta || secondaryCta) ? (
                <div className="flex flex-wrap gap-3 pt-2">
                  {primaryCta}
                  {secondaryCta}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8 lg:py-16">
          <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <section className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3d7a44]">
                  Ex Kitchens Account
                </p>
                <h2 className="text-3xl font-light tracking-tight text-[#111111] md:text-4xl">
                  {asideTitle}
                </h2>
                <p className="max-w-xl text-base leading-7 text-gray-600">
                  {asideBody}
                </p>
              </div>

              <div className="space-y-3 border-t border-black/6 pt-6">
                {asidePoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#3d7a44]" />
                    <p className="text-sm leading-6 text-gray-600">{point}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              {notices}
              <div className="rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)] md:p-8">
                {form}
              </div>
            </section>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
