"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/marketplace-shared";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Our Story", href: "/#mission" },
  { label: "Sell Yours", href: "/#sell" },
];

interface NavbarProps {
  forceSolid?: boolean;
}

interface NavViewerState {
  ready: boolean;
  userEmail: string | null;
  fullName: string | null;
  role: AppRole | null;
}

export default function Navbar({ forceSolid = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewer, setViewer] = useState<NavViewerState>({
    ready: !isSupabaseConfigured(),
    userEmail: null,
    fullName: null,
    role: null,
  });
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createSupabaseClient();
    let active = true;

    async function syncViewer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!user) {
        setViewer({
          ready: true,
          userEmail: null,
          fullName: null,
          role: null,
        });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      setViewer({
        ready: true,
        userEmail: user.email ?? null,
        fullName:
          typeof profile?.full_name === "string" ? profile.full_name : null,
        role: (profile?.role as AppRole | null | undefined) ?? null,
      });
    }

    void syncViewer();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncViewer();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isSolid = forceSolid || scrolled;
  const loginHref = `/login?next=${encodeURIComponent(pathname || "/marketplace")}`;
  const accountLabel =
    viewer.fullName?.split(" ")[0] || viewer.userEmail?.split("@")[0] || "Account";
  const desktopButtonClass = `rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors ${
    isSolid
      ? "bg-[#1a1a1a] text-white hover:bg-[#2b2b2b]"
      : "bg-white/10 text-white hover:bg-white hover:text-[#1a1a1a]"
  }`;
  const desktopSecondaryButtonClass = `rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors ${
    isSolid
      ? "border border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900"
      : "border border-white/20 text-white/82 hover:border-white hover:text-white"
  }`;

  function renderDesktopAuth() {
    if (!viewer.ready) {
      return (
        <div
          className={`h-10 w-28 rounded-full ${
            isSolid ? "bg-gray-100" : "bg-white/10"
          } animate-pulse`}
        />
      );
    }

    if (!viewer.userEmail) {
      return (
        <Link href={loginHref} className={desktopButtonClass}>
          Sign In
        </Link>
      );
    }

    return (
      <div className="flex items-center gap-3">
        {viewer.role === "admin" ? (
          <Link href="/admin" className={desktopSecondaryButtonClass}>
            Admin
          </Link>
        ) : null}
        <Link href="/account" className={desktopButtonClass}>
          {accountLabel}
        </Link>
      </div>
    );
  }

  function renderMobileAuth() {
    if (!viewer.ready) {
      return <div className="mt-8 h-12 rounded-full bg-gray-100 animate-pulse" />;
    }

    if (!viewer.userEmail) {
      return (
        <Link
          href={loginHref}
          onClick={() => setMobileOpen(false)}
          className="mt-8 px-6 py-3.5 rounded-full bg-[#1a1a1a] text-white text-center font-medium hover:bg-[#333] transition-colors"
        >
          Sign In
        </Link>
      );
    }

    return (
      <div className="mt-8 space-y-3">
        {viewer.role === "admin" ? (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="block px-6 py-3.5 rounded-full border border-gray-200 text-center font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
          >
            Admin
          </Link>
        ) : null}
        <Link
          href="/account"
          onClick={() => setMobileOpen(false)}
          className="block px-6 py-3.5 rounded-full bg-[#1a1a1a] text-white text-center font-medium hover:bg-[#333] transition-colors"
        >
          {accountLabel}
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 w-full z-50 flex items-center justify-between px-6 md:px-10 py-3.5 transition-all duration-500 ${
          isSolid
            ? "bg-white/90 backdrop-blur-2xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            : "bg-transparent"
        }`}
      >
        <Link
          href="/"
          onClick={(e) => {
            if (pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          aria-label="ExKitchens - Back to top"
          className="flex items-center"
        >
          <span className="relative block" style={{ width: 160, height: 36 }}>
            {/* Dark logo — visible when scrolled (white navbar) */}
            <Image
              src="/assets/exkitchens_leaf_logo.png"
              alt="ExKitchens"
              fill
              sizes="160px"
              loading="eager"
              className={`object-contain transition-opacity duration-500 ${
                isSolid ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* White logo — visible on transparent hero navbar */}
            <Image
              src="/assets/exkitchens_leaf_logo_white.png"
              alt="ExKitchens"
              fill
              sizes="160px"
              loading="eager"
              className={`object-contain transition-opacity duration-500 drop-shadow-sm ${
                isSolid ? "opacity-0" : "opacity-100"
              }`}
            />
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[13px] font-medium tracking-wide transition-colors hover:text-[#3d7a44] ${
                isSolid ? "text-gray-500" : "text-white/70 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {renderDesktopAuth()}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className={`lg:hidden p-2 rounded-lg transition-colors ${
            isSolid
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
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block text-2xl font-light text-gray-900 py-3 border-b border-gray-100 hover:text-[#3d7a44] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
              {renderMobileAuth()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
