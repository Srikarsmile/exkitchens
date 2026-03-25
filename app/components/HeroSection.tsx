"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import SplineScene from "./SplineScene";

interface HeroSectionProps {
  splineUrl?: string | null;
}

export default function HeroSection({ splineUrl }: HeroSectionProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.5], [1, reducedMotion ? 1 : 0]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, reducedMotion ? 1 : 1.1]);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const imageFallback = (
    <div className="absolute inset-0">
      <motion.div
        className="absolute inset-0"
        style={{ scale: imageScale }}
      >
        <Image
          src="/assets/kitchen_nano_ultrawide_1.png"
          alt="Luxury Ex-Display Kitchen"
          fill
          sizes="100vw"
          className="object-cover object-right pointer-events-none"
          priority
        />
      </motion.div>
      {/* Refined gradient: strong left fade into bg color for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f]/80 via-transparent to-[#0f0f0f]/30" />
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen flex flex-col justify-end overflow-hidden bg-[#0f0f0f]"
    >
      {/* Background */}
      <SplineScene
        sceneUrl={splineUrl}
        fallback={imageFallback}
        className="absolute inset-0 z-0"
      />

      {/* Hero Content - bottom-aligned for editorial feel */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 px-8 md:px-16 lg:px-24 pb-24 md:pb-32 max-w-5xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-white/80 text-xs font-semibold tracking-widest uppercase mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#5a9c64] animate-pulse" />
          UK&apos;s Largest Ex-Display Marketplace
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight text-white leading-[1.05] mb-6"
        >
          A New Life for
          <br />
          <span className="font-serif italic text-[#5a9c64]">
            Luxury Kitchens.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="text-lg md:text-xl text-white/60 font-light mb-10 max-w-xl leading-relaxed"
        >
          2,000+ premium ex-display kitchens from 100+ showrooms.
          <br className="hidden md:block" />
          Bulthaup, Poggenpohl, Siematic. Up to 70% off retail.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="flex flex-wrap items-center gap-4"
        >
          <a
            href="#kitchens"
            className="px-8 py-4 rounded-full bg-white text-[#1a1a1a] font-medium tracking-wide hover:bg-[#5a9c64] hover:text-white transition-all flex items-center gap-3 group shadow-xl"
          >
            Browse Kitchens
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#sell"
            className="px-8 py-4 rounded-full border border-white/25 text-white font-medium tracking-wide hover:bg-white/10 transition-all"
          >
            Sell Your Kitchen
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-white/30" />
        </motion.div>
      </motion.div>
    </section>
  );
}
