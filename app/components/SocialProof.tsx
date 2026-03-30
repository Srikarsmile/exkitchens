"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import SplitText from "./SplitText";


const brandFeatures = [
  { name: "Bulthaup", size: "text-2xl md:text-3xl" },
  { name: "Poggenpohl", size: "text-3xl md:text-4xl" },
  { name: "SieMatic", size: "text-xl md:text-2xl" },
  { name: "Leicht", size: "text-xl md:text-2xl" },
];

const testimonials = [
  {
    name: "Sarah & James T.",
    location: "Surrey",
    text: "We saved over \u00a325,000 on a stunning Bulthaup kitchen that was barely six months old. The process was seamless from start to finish. Our installer said it was the best condition he\u2019d ever seen.",
    rating: 5,
    kitchen: "Bulthaup B3",
    saved: "\u00a325,000",
  },
  {
    name: "Mark D.",
    location: "Edinburgh",
    text: "I was sceptical about buying a used kitchen, but ExKitchens changed my mind completely. Professional dismantling, careful delivery, and the kitchen looks absolutely brand new in our home.",
    rating: 5,
    kitchen: "Siematic Pure",
    saved: "\u00a318,500",
  },
  {
    name: "Olivia & Tom R.",
    location: "Bath",
    text: "The auction process was exciting and transparent. We won a gorgeous Poggenpohl kitchen for a fraction of what we\u2019d budgeted. Truly the smarter way to get a luxury kitchen.",
    rating: 5,
    kitchen: "Poggenpohl +Segmento",
    saved: "\u00a331,000",
  },
];

export default function SocialProof() {
  return (
    <section className="w-full py-28 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d7a44]/30 to-transparent" />
      {/* As Featured In */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-6 md:px-8 text-center mb-20"
      >
        <span className="text-[#3d7a44] text-xs font-semibold tracking-widest uppercase mb-10 block">
          Brands We Carry
        </span>
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
          {brandFeatures.map((item) => (
            <span
              key={item.name}
              className={`${item.size} font-serif italic text-gray-900 hover:text-[#3d7a44] transition-colors duration-500 cursor-default`}
            >
              {item.name}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Testimonials */}
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-[#3d7a44] font-semibold tracking-widest uppercase text-xs mb-5 block">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
            <SplitText
              text="Loved by"
              className="block"
              charDelay={0.03}
              duration={0.75}
            />
            <SplitText
              text="Homeowners"
              className="block font-serif italic text-[#3d7a44]"
              charDelay={0.04}
              duration={0.8}
              italic
            />
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative p-8 rounded-2xl bg-[#fafafa] border border-gray-100 hover:shadow-lg hover:border-[#3d7a44]/20 transition-all duration-500"
            >
              <Quote className="w-8 h-8 text-[#3d7a44]/15 mb-5" />
              <p className="text-gray-600 leading-relaxed mb-8 text-[15px]">
                {t.text}
              </p>

              <div className="flex items-center gap-0.5 mb-5" role="img" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    aria-hidden="true"
                    className="w-3.5 h-3.5 fill-[#3d7a44] text-[#3d7a44]"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-gray-200/60">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{t.kitchen}</p>
                  <p className="text-sm font-semibold text-[#3d7a44] mt-0.5">
                    Saved {t.saved}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
