import FeatureSection from "@/components/home/FeatureSection";
import HeroSection from "@/components/home/HeroSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-rice-background text-rice-text">
      <HeroSection />
      <FeatureSection />
      <HowItWorksSection />
    </main>
  );
}
