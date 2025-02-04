// app/page.tsx
"use client";

import HeroSection from "@/components/hero-section";

export default function Home() {
  return (
    // Instead of "h-full", you can use a "full-height" class that leverages --vh if needed
    <main className="full-height">
      <HeroSection />
    </main>
  );
}
