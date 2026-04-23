import type { Metadata } from "next";
import type { ReactNode } from "react";
import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";

export const metadata: Metadata = {
  title: "Admin | ExKitchens",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminLayoutProps {
  params: Promise<Record<string, never>>;
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <Navbar forceSolid />
      <div className="pt-24">{children}</div>
      <Footer />
    </div>
  );
}
