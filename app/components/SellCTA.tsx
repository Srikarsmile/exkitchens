"use client";

import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import Image from "next/image";
import SplineScene from "./SplineScene";

interface SellCTAProps {
  splineUrl?: string | null;
}

const supportPhone =
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPPORT_PHONE || "07913546586";

function getSupportPhoneHref(phone: string) {
  const digits = phone.trim().replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return `tel:${digits}`;
  }

  if (digits.startsWith("0")) {
    return `tel:+44${digits.slice(1)}`;
  }

  return `tel:${digits}`;
}

export default function SellCTA({ splineUrl }: SellCTAProps) {
  const supportPhoneHref = getSupportPhoneHref(supportPhone);
  const imageFallback = (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden">
      <Image
        src="/assets/kitchen_nano_landscape.jpg"
        alt="Sell your kitchen"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#3d7a44]/30 via-transparent to-[#0f0f0f]/60" />
    </div>
  );

  return (
    <section id="sell" className="w-full bg-[#0f0f0f] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d7a44]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-28 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-[#5a9c64] font-semibold tracking-widest uppercase text-xs mb-5 block">
              Sell Your Kitchen
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-[1.1]">
              Turn Your Kitchen
              <br />
              Into{" "}
              <span className="font-serif italic text-[#5a9c64]">Cash.</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-10 max-w-lg">
              Don&apos;t let your quality kitchen go to waste. We&apos;ll
              value it, find a buyer, and coordinate everything &mdash;
              hassle-free.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-10">
              <a
                href={supportPhoneHref}
                className="px-8 py-4 rounded-full bg-white text-[#1a1a1a] font-medium tracking-wide hover:bg-[#3d7a44] hover:text-white transition-all flex items-center gap-3 group"
              >
                Get a Free Valuation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={supportPhoneHref}
                aria-label={`Call ExKitchens on ${supportPhone}`}
                className="group flex items-center gap-3 rounded-full border border-white/10 px-4 py-3 text-white/45 transition hover:border-[#5a9c64]/50 hover:bg-white/5 hover:text-white"
              >
                <div className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center transition group-hover:border-[#5a9c64]/60 group-hover:text-[#8bcf93]">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest block">
                    Call Us
                  </span>
                  <span className="text-white/70 text-sm font-medium">
                    {supportPhone}
                  </span>
                </div>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-white/25 text-xs tracking-wide">
              <span>Free valuation</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>No obligation</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>Nationwide</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <SplineScene
              sceneUrl={splineUrl}
              fallback={imageFallback}
              className="w-full aspect-[4/3] rounded-2xl overflow-hidden"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
