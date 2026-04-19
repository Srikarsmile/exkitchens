import type { ReactNode } from "react";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";

interface MarketplaceLayoutProps {
  children: ReactNode;
}

export default function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <Navbar forceSolid />
      <div className="relative overflow-hidden pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(90,156,100,0.16),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-12 h-[18rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,250,247,0))]" />
        {children}
      </div>
      <Footer />
    </div>
  );
}
