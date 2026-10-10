import CTASection from "@/components/home/CTASection";
import FeatureSection from "@/components/home/FeatureSection";
import HeroSection from "@/components/home/HeroSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import NewsSliderSection from "@/components/home/NewsSliderSection";

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <HeroSection />
      <FeatureSection />
      <HowItWorksSection />
      <NewsSliderSection />
      <CTASection />
    </main>
  );
}
