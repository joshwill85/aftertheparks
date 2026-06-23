import { QuickFinder } from "@/components/home/QuickFinder";
import { HomeHeroImage } from "@/components/home/HomeHeroImage";
import { LagoonHeroEasterEgg } from "@/components/magic/LagoonHeroEasterEgg";

interface HomeHeroProps {
  resorts?: { slug: string; name: string }[];
}

export function HomeHero({ resorts = [] }: HomeHeroProps) {
  return (
    <section className="home-hero" aria-label="After the Parks home">
      <HomeHeroImage />
      <div className="home-hero__overlay" aria-hidden />

      <LagoonHeroEasterEgg>
        <div className="hero-content">
          <p className="eyebrow">Sunshine to Starlight</p>
          <h1 className="display">Find the magic between park days.</h1>
          <p className="hero-copy">
            Discover resort activities, movies, campfires, crafts, poolside fun, and
            other current recreation-calendar moments during your stay.
          </p>
          <QuickFinder resorts={resorts} />
        </div>
      </LagoonHeroEasterEgg>
    </section>
  );
}
