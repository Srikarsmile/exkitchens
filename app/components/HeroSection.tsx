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
import SplitText from "./SplitText";

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
          className="object-cover object-center pointer-events-none"
          priority
        />
      </motion.div>
      {/* Subtle uniform darkening + radial vignette for cinematic depth */}
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(15,15,15,0.7) 100%)",
        }}
      />
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen flex flex-col justify-center items-center overflow-hidden bg-[#0f0f0f]"
    >
      {/* Background */}
      <SplineScene
        sceneUrl={splineUrl}
        fallback={imageFallback}
        className="absolute inset-0 z-0"
      />

      {/* Hero Content */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 px-8 flex flex-col items-center text-center"
      >
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-white leading-[1.15] mb-8 text-center">
          <span className="block">
            <SplitText
              text="A New Life for"
              className="justify-center"
              charDelay={0.04}
              duration={0.8}
              yOffset={90}
              bottomMargin={0}
            />
          </span>
          <span className="block">
            <SplitText
              text="Luxury Kitchens."
              className="justify-center italic text-[#5a9c64] [font-family:var(--font-lora),ui-serif,Georgia,serif]"
              charDelay={0.035}
              duration={0.85}
              yOffset={90}
              bottomMargin={0}
              italic
            />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="text-base sm:text-lg md:text-xl font-light mb-10 max-w-xl leading-relaxed text-center bg-clip-text text-transparent bg-[length:200%_100%] bg-[linear-gradient(90deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.9)_50%,rgba(255,255,255,0.3)_100%)] animate-[shimmer_3s_ease-in-out_infinite]"
        >
          Premium ex-display kitchens.
          <br className="hidden md:block" />
          Up to 70% off retail.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#kitchens"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 font-medium tracking-wide hover:bg-white hover:text-[#1a1a1a] transition-all duration-300 group"
          >
            <span className="shimmer-text bg-clip-text text-transparent bg-[length:200%_100%] bg-[linear-gradient(90deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,1)_50%,rgba(255,255,255,0.5)_100%)] animate-[shimmer_3s_ease-in-out_infinite] group-hover:bg-none group-hover:text-[#1a1a1a]">
              Explore
            </span>
            <ArrowRight className="w-4 h-4 text-white group-hover:text-[#1a1a1a] group-hover:translate-x-1 transition-all" />
          </a>
          <a
            href="#sell"
            className="px-10 py-4 rounded-full border border-white/15 text-white/70 font-medium tracking-wide hover:bg-white/10 hover:text-white transition-all duration-300"
          >
            Sell Yours
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-white/25" />
        </motion.div>
      </motion.div>
    </section>
  );
}
