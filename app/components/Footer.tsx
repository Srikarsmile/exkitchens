"use client";

import Image from "next/image";
import Link from "next/link";

const links = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Sell", href: "/#sell" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "About", href: "/#mission" },
  { label: "Login", href: "/login" },
  { label: "Contact", href: "mailto:info@exkitchens.com" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#111111] text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d7a44]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <Image
            src="/assets/exkitchens_leaf_logo_white.png"
            alt="ExKitchens"
            width={140}
            height={28}
            className="object-contain"
          />

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {links.map((link) => (
              link.href.startsWith("/") ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/50 hover:text-[#5a9c64] transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/50 hover:text-[#5a9c64] transition-colors"
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col gap-4 text-center md:text-left">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} ExKitchens. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-white/20 hover:text-[#5a9c64] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="space-y-1 text-xs text-white/20">
            <p>Ex Kitchens is a trading name of ICON KITCHEN DESIGNS LTD.</p>
            <p>
              Registered in England and Wales. Company No. 12082766. VAT No.
              GB350707906.
            </p>
            <p>116 Brighton Road, Purley, England, CR8 4DB.</p>
            <p>info@exkitchens.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
