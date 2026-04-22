"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Tag } from "lucide-react";
import Link from "next/link";
import ListingImage from "@/app/components/ListingImage";
import type { ListingCardData } from "@/lib/marketplace-shared";
import {
  calculatePercentageOff,
  formatMoney,
  formatTimeRemaining,
} from "@/lib/marketplace-shared";
import { getShimmerBlurDataUrl } from "@/lib/image-placeholder";

const cardBlurDataUrl = getShimmerBlurDataUrl(720, 540);

type FilterType = "all" | "buy" | "auction";

function TiltCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
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

export default function FeaturedKitchens({ items }: { items: ListingCardData[] }) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all"
      ? items
      : items.filter((item) =>
          filter === "auction" ? item.saleType === "auction" : item.saleType === "buy_now",
        );

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
          <div className="flex flex-wrap gap-2">
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
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-[2rem] border border-dashed border-gray-200 bg-[#fafafa] px-6 py-12 text-center">
              <h3 className="text-xl font-medium text-gray-900">No featured kitchens yet</h3>
              <p className="mt-3 text-sm text-gray-500">
                Create published listings in the admin panel and they will appear here.
              </p>
              <div className="mt-6">
                <Link
                  href="/marketplace"
                  className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2b2b2b]"
                >
                  Open marketplace
                </Link>
              </div>
            </div>
          ) : null}

          {filtered.map((item, index) => {
            const buyNowPricePence = item.buyNowPricePence ?? item.currentPricePence;
            const buyNowDiscountPercent = calculatePercentageOff(
              item.originalPricePence,
              buyNowPricePence,
            );

            return (
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
                      <div className="absolute top-3 left-3 z-10 flex gap-2">
                        {item.saleType === "auction" ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            {formatTimeRemaining(item.auction?.endAt)}
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
                          {item.brand || "Curated"}
                        </span>
                      </div>

                      <ListingImage
                        src={item.heroImageUrl || "/assets/kitchen_nano_square.jpg"}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={50}
                        placeholder="blur"
                        blurDataURL={cardBlurDataUrl}
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
                        {item.saleType === "buy_now" ? (
                          <div>
                            <span className="text-gray-300 line-through text-xs block">
                              {item.originalPricePence
                                ? `RRP ${formatMoney(item.originalPricePence)}`
                                : "RRP on request"}
                            </span>
                            <span className="text-2xl font-medium text-gray-900">
                              {formatMoney(buyNowPricePence)}
                            </span>
                            {buyNowDiscountPercent ? (
                              <span className="mt-1 text-xs font-medium text-[#3d7a44] block">
                                Available at {buyNowDiscountPercent}% off retail
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[#3d7a44] uppercase tracking-wider text-[10px] font-bold block">
                              Current Bid
                            </span>
                            <span className="text-2xl font-medium text-gray-900">
                              {formatMoney(item.currentPricePence)}
                            </span>
                          </div>
                        )}

                        <Link
                          href={`/marketplace/${item.slug}`}
                          aria-label={`View details for ${item.title}`}
                          className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#3d7a44] group-hover:border-[#3d7a44] group-hover:text-white active:bg-[#3d7a44] active:border-[#3d7a44] active:text-white transition-all duration-300"
                        >
                          <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-14"
        >
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-3 px-7 py-3 rounded-full text-sm font-medium bg-gray-100 text-gray-600 transition hover:bg-gray-200"
          >
            Browse All Kitchens
            <span className="text-[10px] uppercase tracking-wider text-[#3d7a44] bg-white px-2 py-0.5 rounded">Live</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
