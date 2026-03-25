"use client";

import { motion } from "framer-motion";
import { Recycle, BadgeCheck } from "lucide-react";
import Image from "next/image";
import SplineScene from "./SplineScene";
import SplitText from "./SplitText";

interface MissionSectionProps {
  splineUrl?: string | null;
}

export default function MissionSection({ splineUrl }: MissionSectionProps) {
  const logoFallback = (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#f5f0eb] to-[#e8e0d6] aspect-square flex items-center justify-center group">
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #3d7a44 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>
      <Image
        src="/assets/exkitchens_leaf_logo.png"
        alt="ExKitchens Logo"
        width={400}
        height={400}
        className="w-3/4 h-auto object-contain relative z-10 drop-shadow-lg group-hover:scale-105 transition-transform duration-700"
      />
    </div>
  );

  return (
    <section
      id="mission"
      className="w-full max-w-7xl mx-auto px-6 md:px-8 py-28 relative"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
        >
          <SplineScene
            sceneUrl={splineUrl}
            fallback={logoFallback}
            className="aspect-square rounded-3xl overflow-hidden"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col justify-center"
        >
          <span className="text-[#3d7a44] font-semibold tracking-widest uppercase text-xs mb-5">
            Our Mission
          </span>
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-[1.1]">
            <SplitText
              text="Design with a"
              className="block"
              charDelay={0.03}
              duration={0.75}
            />
            <SplitText
              text="Conscience."
              className="block font-serif italic text-[#3d7a44]"
              charDelay={0.04}
              duration={0.8}
            />
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed mb-4">
            Thousands of immaculate display kitchens are discarded yearly when
            showrooms refresh.{" "}
            <strong className="text-gray-800">ExKitchens</strong> was born to
            change this.
          </p>
          <p className="text-gray-500 text-lg leading-relaxed mb-10">
            We connect homeowners with premium showrooms nationwide, keeping
            quality materials out of landfill.
          </p>

          {/* Value props */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#3d7a44]/10 flex items-center justify-center mb-3">
                <BadgeCheck className="w-5 h-5 text-[#3d7a44]" />
              </div>
              <span className="text-2xl font-light text-gray-900">20+</span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider mt-1">
                Years Experience
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#3d7a44]/10 flex items-center justify-center mb-3">
                <Recycle className="w-5 h-5 text-[#3d7a44]" />
              </div>
              <span className="text-2xl font-light text-gray-900">Zero</span>
              <span className="text-[11px] text-gray-400 uppercase tracking-wider mt-1">
                Waste
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
