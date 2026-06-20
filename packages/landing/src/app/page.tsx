import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Checks } from "@/components/Checks";
import { Stats } from "@/components/Stats";
import { ProductDetail } from "@/components/ProductDetail";
import { Pricing } from "@/components/Pricing";
import { Faq } from "@/components/Faq";
import { Cta } from "@/components/Cta";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <hr className="lp-rule" />
        <HowItWorks />
        <hr className="lp-rule" />
        <Checks />
        <Stats />
        <ProductDetail />
        <hr className="lp-rule" />
        <Pricing />
        <hr className="lp-rule" />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
