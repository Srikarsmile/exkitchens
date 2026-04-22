import type { ReactNode } from "react";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";

interface AccountLayoutProps {
  params: Promise<Record<string, never>>;
  children: ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <Navbar forceSolid />
      <div className="pt-24">{children}</div>
      <Footer />
    </div>
  );
}
