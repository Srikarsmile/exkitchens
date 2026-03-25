"use client";

import Navbar from "./Navbar";
import HeroSection from "./HeroSection";

import MissionSection from "./MissionSection";
import HowItWorks from "./HowItWorks";
import FeaturedKitchens from "./FeaturedKitchens";

import SocialProof from "./SocialProof";
import SellCTA from "./SellCTA";
import Footer from "./Footer";
import BackToTop from "./BackToTop";

// Spline community scene URLs — swap with custom kitchen scenes from spline.design/community
// Set to null to use beautiful image fallbacks (recommended until you have kitchen-themed 3D scenes)
const SPLINE_SCENES = {
  hero: null as string | null,
  mission: null as string | null,
  sellCta: null as string | null,
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center overflow-hidden bg-[#fafafa]">
      <Navbar />
      <HeroSection splineUrl={SPLINE_SCENES.hero} />
      <MissionSection splineUrl={SPLINE_SCENES.mission} />

      <HowItWorks />
      <FeaturedKitchens />
      <SocialProof />
      <SellCTA splineUrl={SPLINE_SCENES.sellCta} />
      <Footer />
      <BackToTop />
    </main>
  );
}
