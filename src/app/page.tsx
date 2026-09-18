import CTASection from "@/components/home/CTASection";
import FeatureSection from "@/components/home/FeatureSection";
import HeroSection from "@/components/home/HeroSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import NewsSliderSection from "@/components/home/NewsSliderSection";
import QuickAccessSection from "@/components/home/QuickAccessSection";

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <HeroSection />
      <QuickAccessSection />
      <FeatureSection />
      <HowItWorksSection />
      <NewsSliderSection />
      <CTASection />
    </main>
  );
}
