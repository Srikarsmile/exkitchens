"use client";

import { motion } from "framer-motion";
import { Tag, Hammer, Truck } from "lucide-react";
import SplitText from "./SplitText";

const steps = [
  {
    icon: Tag,
    num: "01",
    title: "Browse & Bid",
    description:
      "Explore curated ex-display and pre-loved kitchens. Buy at a fixed price or bid in our weekly live auctions.",
  },
  {
    icon: Hammer,
    num: "02",
    title: "Professional Dismantle",
    description:
      "Our professionals dismantle and pack the kitchen from the showroom, ensuring zero damage.",
  },
  {
    icon: Truck,
    num: "03",
    title: "Delivery & Install",
    description:
      "Insured nationwide delivery to your door. Need fitting help? We connect you with trusted local installers.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-28 relative bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-[#3d7a44] font-semibold tracking-widest uppercase text-xs mb-5 block">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            <SplitText
              text="From Showroom to"
              className="block"
              charDelay={0.03}
              duration={0.75}
            />
            <SplitText
              text="Your Home"
              className="block font-serif italic text-[#3d7a44]"
              charDelay={0.04}
              duration={0.8}
              italic
            />
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-[48px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[#3d7a44]/20 to-transparent z-0" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-3xl bg-white border border-gray-200 flex items-center justify-center mb-8 shadow-sm group-hover:shadow-lg group-hover:border-[#3d7a44]/30 transition-all duration-500">
                  <Icon className="w-9 h-9 text-[#3d7a44] group-hover:scale-110 transition-transform duration-500" />
                </div>
                <span className="text-[10px] text-[#3d7a44]/40 font-bold tracking-widest mb-3">
                  STEP {step.num}
                </span>
                <h4 className="text-xl font-medium text-gray-900 mb-3">
                  {step.title}
                </h4>
                <p className="text-gray-500 leading-relaxed max-w-[280px]">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
