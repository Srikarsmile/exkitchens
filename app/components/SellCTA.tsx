"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import Image from "next/image";
import SplineScene from "./SplineScene";

interface SellCTAProps {
  splineUrl?: string | null;
}

export default function SellCTA({ splineUrl }: SellCTAProps) {
  const [toast, setToast] = useState<string | null>(null);
  const imageFallback = (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden">
      <Image
        src="/assets/kitchen_nano_landscape.png"
        alt="Sell your kitchen"
        fill
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
            <span className="text-[#5a9c64] font-semibold tracking-widest uppercase text-xs mb-6 block">
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

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <a
                href="#sell"
                onClick={(e) => { e.preventDefault(); setToast("Free valuation coming soon! Call 123 456 789"); setTimeout(() => setToast(null), 2000); }}
                className="px-8 py-4 rounded-full bg-white text-[#1a1a1a] font-medium tracking-wide hover:bg-[#5a9c64] hover:text-white transition-all flex items-center gap-3 group"
              >
                Get a Free Valuation
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="tel:123456789"
                className="flex items-center gap-3 text-white/40 hover:text-[#5a9c64] transition-colors group"
              >
                <div className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center group-hover:border-[#5a9c64]/40 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest block">
                    Call Us
                  </span>
                  <span className="text-white/70 text-sm font-medium">
                    123 456 789
                  </span>
                </div>
              </a>
            </div>

            <div className="flex items-center gap-5 text-white/25 text-xs tracking-wide">
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium shadow-xl border border-white/10">
          {toast}
        </div>
      )}
    </section>
  );
}
