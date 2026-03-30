"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const navLinks = [
  { label: "Kitchens", href: "#kitchens" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Our Story", href: "#mission" },
  { label: "Sell Yours", href: "#sell" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-10 py-3.5 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-2xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            : "bg-transparent"
        }`}
      >
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }} aria-label="ExKitchens - Back to top" className="flex items-center">
          <span className="relative block" style={{ width: 160, height: 36 }}>
            {/* Dark logo — visible when scrolled (white navbar) */}
            <Image
              src="/assets/exkitchens_leaf_logo.png"
              alt="ExKitchens"
              width={160}
              height={36}
              loading="eager"
              style={{ width: "auto", height: "auto" }}
              className={`object-contain absolute inset-0 transition-opacity duration-500 ${
                scrolled ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* White logo — visible on transparent hero navbar */}
            <Image
              src="/assets/exkitchens_leaf_logo_white.png"
              alt="ExKitchens"
              width={160}
              height={36}
              loading="eager"
              style={{ width: "auto", height: "auto" }}
              className={`object-contain absolute inset-0 transition-opacity duration-500 drop-shadow-sm ${
                scrolled ? "opacity-0" : "opacity-100"
              }`}
            />
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-[13px] font-medium tracking-wide transition-colors hover:text-[#3d7a44] ${
                scrolled ? "text-gray-500" : "text-white/70 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            scrolled
              ? "text-gray-900 hover:bg-gray-100"
              : "text-white hover:bg-white/10"
          }`}
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white flex flex-col pt-20 px-8 shadow-2xl"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setMobileOpen(false)}
                    className="text-2xl font-light text-gray-900 py-3 border-b border-gray-100 hover:text-[#3d7a44] transition-colors"
                  >
                    {link.label}
                  </motion.a>
                ))}
              </div>
              <a
                href="#sell"
                onClick={() => setMobileOpen(false)}
                className="mt-8 px-6 py-3.5 rounded-full bg-[#1a1a1a] text-white text-center font-medium hover:bg-[#333] transition-colors"
              >
                Sell Your Kitchen
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
