"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Tag } from "lucide-react";
import Image from "next/image";

const listings = [
  {
    id: 1,
    title: "The Minimalist Oat",
    currentBid: "12,500",
    endsIn: "2h 45m",
    type: "auction" as const,
    image: "/assets/kitchen_nano_square.png",
    tags: ["Gaggenau", "Solid Oak"],
    brand: "Bulthaup",
  },
  {
    id: 2,
    title: "Classic White Shaker",
    price: "18,900",
    originalPrice: "45,000",
    type: "buy" as const,
    image: "/assets/kitchen_nano_portrait.png",
    tags: ["Bespoke Cabinetry", "Marble Island"],
    brand: "Poggenpohl",
  },
  {
    id: 3,
    title: "Scandinavian Light Ash",
    currentBid: "9,200",
    endsIn: "5h 10m",
    type: "auction" as const,
    image: "/assets/kitchen_hero_ultra_clear_1774361090040.png",
    tags: ["Integrated Handles", "Siemens"],
    brand: "Nobilia",
  },
  {
    id: 4,
    title: "Modern Matte Charcoal",
    currentBid: "8,500",
    endsIn: "4h 12m",
    type: "auction" as const,
    image: "/assets/kitchen_nano_landscape.png",
    tags: ["Miele", "Quartz Surfaces"],
    brand: "Siematic",
  },
  {
    id: 5,
    title: "Handleless Dove Grey",
    price: "11,225",
    originalPrice: "32,000",
    type: "buy" as const,
    image: "/assets/kitchen_fal_landscape.png",
    tags: ["Bosch", "Dekton Worktops"],
    brand: "Schuller",
  },
  {
    id: 6,
    title: "Heritage Painted Sage",
    price: "9,995",
    originalPrice: "28,500",
    type: "buy" as const,
    image: "/assets/kitchen_fal_square.png",
    tags: ["Belfast Sink", "Granite"],
    brand: "Clive Christian",
  },
];

type FilterType = "all" | "buy" | "auction";

function TiltCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const card = cardRef.current;
    if (!card) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${y * -4}deg) rotateY(${x * 4}deg) scale3d(1.01, 1.01, 1.01)`;
    });
  };

  const handleMouseLeave = () => {
    if (reducedMotion) return;
    cancelAnimationFrame(rafRef.current);
    const card = cardRef.current;
    if (card)
      card.style.transform =
        "perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)";
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="transition-transform duration-300 ease-out will-change-transform"
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

export default function FeaturedKitchens() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const filtered =
    filter === "all" ? listings : listings.filter((l) => l.type === filter);

  return (
    <section
      id="kitchens"
      className="w-full py-28 bg-white relative"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-14 gap-6"
        >
          <div>
            <span className="text-[#3d7a44] font-semibold tracking-widest uppercase text-xs mb-5 block">
              Featured Collections
            </span>
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight mb-3">
              Curated{" "}
              <span className="font-serif italic text-[#3d7a44]">Luxury</span>
            </h2>
            <p className="text-gray-400 text-base">
              Premium ex-display kitchens from {"\u00a3"}1,950.
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "buy", "auction"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === f
                    ? "bg-[#1a1a1a] text-white"
                    : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "All" : f === "buy" ? "Buy Now" : "Auctions"}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              layout
            >
              <TiltCard>
                <div className="group relative rounded-xl overflow-hidden bg-white border border-gray-100 hover:border-gray-200 active:border-[#3d7a44]/30 transition-all cursor-pointer hover:shadow-xl active:shadow-lg duration-500">
                  <div className="relative h-[240px] w-full overflow-hidden bg-gray-50">
                    {/* Badges */}
                    <div className="absolute top-3 left-3 z-10 flex gap-2">
                      {item.type === "auction" ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold">
                          <Clock className="w-3 h-3" />
                          {item.endsIn}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#3d7a44]/80 backdrop-blur-md text-white text-[11px] font-semibold">
                          <Tag className="w-3 h-3" />
                          Buy Now
                        </div>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-md text-[11px] font-semibold text-gray-600">
                        {item.brand}
                      </span>
                    </div>

                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-gray-400 text-[10px] bg-gray-50 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 mb-0.5 group-hover:text-[#3d7a44] transition-colors">
                      {item.title}
                    </h3>

                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-100">
                      {item.type === "buy" ? (
                        <div>
                          <span className="text-gray-300 line-through text-xs block">
                            RRP {"\u00a3"}{item.originalPrice}
                          </span>
                          <span className="text-2xl font-medium text-gray-900">
                            {"\u00a3"}{item.price}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[#3d7a44] uppercase tracking-wider text-[10px] font-bold block">
                            Current Bid
                          </span>
                          <span className="text-2xl font-medium text-gray-900">
                            {"\u00a3"}{item.currentBid}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => showToast("Kitchen details coming soon!")}
                        aria-label={`View details for ${item.title}`}
                        className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#3d7a44] group-hover:border-[#3d7a44] group-hover:text-white active:bg-[#3d7a44] active:border-[#3d7a44] active:text-white transition-all duration-300"
                      >
                        <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-14"
        >
          <button
            onClick={() => showToast("Coming soon \u2014 we\u2019re adding more kitchens every day!")}
            className="inline-flex items-center gap-3 px-7 py-3 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-[#1a1a1a] hover:text-white transition-all duration-300 group"
          >
            View All 2,000+ Kitchens
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium shadow-xl border border-white/10">
          {toast}
        </div>
      )}
    </section>
  );
}
