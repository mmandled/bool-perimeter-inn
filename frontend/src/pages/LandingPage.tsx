import { Footer } from "../sections/Footer";
import { AboutSection } from "../sections/AboutSection";
import { BookingSection } from "../sections/BookingSection";
import { FeaturesSection } from "../sections/FeaturesSection";
import { HeroSection } from "../sections/HeroSection";
import { RoomsSection } from "../sections/RoomsSection";

export function LandingPage() {
  return (
    <div className="page-frame">
      <HeroSection />
      <RoomsSection />
      <BookingSection />
      <AboutSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
}

