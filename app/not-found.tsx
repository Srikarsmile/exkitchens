import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/assets/exkitchens_leaf_logo.png"
        alt="ExKitchens"
        width={160}
        height={33}
        className="object-contain brightness-0 invert mb-12"
      />
      <h1 className="text-6xl md:text-8xl font-light text-white mb-4 tracking-tight">
        404
      </h1>
      <p className="text-white/50 text-lg mb-10 max-w-md">
        This page doesn&apos;t exist. Perhaps the kitchen you&apos;re looking
        for has already found a new home.
      </p>
      <Link
        href="/"
        className="px-8 py-4 rounded-full bg-white text-[#1a1a1a] font-medium tracking-wide hover:bg-[#5a9c64] hover:text-white transition-all"
      >
        Back to Home
      </Link>
    </div>
  );
}
