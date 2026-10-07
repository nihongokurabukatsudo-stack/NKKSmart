import { AboutSection } from "../components/common/AboutSection";
import { BasecampSection } from "../components/common/BasecampSection";
import { GallerySection } from "../components/common/GallerySection";
import { Hero } from "../components/common/Hero";
import { LearningSection } from "../components/common/LearningSection";
import { MemberHub } from "../components/common/MemberHub";
import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";

export function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <MemberHub />
        <AboutSection />
        <GallerySection />
        <LearningSection />
        <BasecampSection />
      </main>
      <Footer />
    </>
  );
}
