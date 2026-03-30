"use client";

import { motion } from "framer-motion";
import { useState, type SyntheticEvent } from "react";

/* Each brand with its website domain for logo fetching via logo.clearbit.com */
const brands = [
  { name: "Bulthaup", domain: "bulthaup.com" },
  { name: "Poggenpohl", domain: "poggenpohl.com" },
  { name: "SieMatic", domain: "siematic.com" },
  { name: "Leicht", domain: "leicht.com" },
  { name: "Schüller", domain: "schueller.de" },
  { name: "Nobilia", domain: "nobilia.de" },
  { name: "Tom Howley", domain: "tomhowley.co.uk" },
  { name: "Smallbone", domain: "smallbone.co.uk" },
  { name: "Miele", domain: "miele.com" },
  { name: "Gaggenau", domain: "gaggenau.com" },
  { name: "Siemens", domain: "siemens-home.bsh-group.com" },
  { name: "Bosch", domain: "bosch-home.co.uk" },
  { name: "Neff", domain: "neff-home.com" },
  { name: "Fisher & Paykel", domain: "fisherpaykel.com" },
  { name: "Sub-Zero", domain: "subzero-wolf.com" },
  { name: "Smeg", domain: "smeg.com" },
  { name: "Cosentino", domain: "cosentino.com" },
  { name: "Caesarstone", domain: "caesarstone.com" },
];

function BrandCard({ name, domain }: { name: string; domain: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    setImgFailed(true);
    e.currentTarget.style.display = "none";
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#5a9c64]/20 transition-all duration-300 group min-h-[100px]">
      <div className="w-10 h-10 flex items-center justify-center">
        {!imgFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://logo.clearbit.com/${domain}`}
            alt={`${name} logo`}
            width={40}
            height={40}
            className="object-contain rounded-md opacity-70 group-hover:opacity-100 transition-opacity duration-300"
            onError={handleError}
            loading="lazy"
          />
        ) : (
          <span className="text-lg font-bold text-white/25 group-hover:text-white/50 transition-colors">
            {name.charAt(0)}
          </span>
        )}
      </div>
      <span className="text-[11px] text-white/30 group-hover:text-white/60 transition-colors font-medium tracking-wide text-center">
        {name}
      </span>
    </div>
  );
}

export default function BrandsSection() {
  return (
    <section
      id="brands"
      className="w-full py-28 bg-[#111111] relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d7a44]/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 px-6"
      >
        <span className="text-[#5a9c64] font-semibold tracking-widest uppercase text-xs mb-5 block">
          Trusted Partners
        </span>
        <h2 className="text-4xl md:text-5xl font-light text-white tracking-tight">
          Premium{" "}
          <span className="font-serif italic text-white/80">Brands.</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 px-6 max-w-5xl mx-auto"
        role="region"
        aria-label={`Brands: ${brands.map((b) => b.name).join(", ")}`}
      >
        {brands.map((brand) => (
          <BrandCard key={brand.name} name={brand.name} domain={brand.domain} />
        ))}
      </motion.div>
    </section>
  );
}
