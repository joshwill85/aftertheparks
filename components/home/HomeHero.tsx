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
      <div
        className="wow-living-resort-diorama-hero"
        data-wow-moment="living_resort_diorama_hero"
        aria-hidden
      >
        <span className="wow-diorama__shimmer" />
        <span className="wow-diorama__lantern-bloom" />
        <span className="wow-diorama__paper-grain" />
      </div>
      <span
        className="hidden-resort-magic hrm-hero-lanterns"
        data-hidden-detail="hero_lantern_alignment"
        aria-hidden
      />

      <LagoonHeroEasterEgg>
        <div className="hero-content">
          <p className="eyebrow">Sunshine to Starlight</p>
          <h1 className="display">Find the magic between park days.</h1>
          <p className="hero-copy">
            Discover resort activities, movies, campfires, crafts, poolside fun, and
            other current recreation-calendar ideas during your stay.
          </p>
          <QuickFinder resorts={resorts} />
        </div>
      </LagoonHeroEasterEgg>
    </section>
  );
}
