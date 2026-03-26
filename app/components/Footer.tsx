"use client";

import Image from "next/image";

const links = [
  { label: "Buy", href: "#kitchens" },
  { label: "Sell", href: "#sell" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#mission" },
  { label: "Contact", href: "mailto:info@exkitchens.com" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#111111] text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d7a44]/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <Image
            src="/assets/exkitchens_leaf_logo.png"
            alt="ExKitchens"
            width={140}
            height={28}
            className="object-contain"
          />

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-white/50 hover:text-[#5a9c64] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} ExKitchens. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-white/20 hover:text-[#5a9c64] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <span className="text-white/10">|</span>
            <p className="text-white/20 text-xs">
              London, UK &middot; info@exkitchens.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
