import { QuickFinder } from "@/components/home/QuickFinder";
import { LagoonHeroEasterEgg } from "@/components/magic/LagoonHeroEasterEgg";

interface HomeHeroProps {
  resorts?: { slug: string; name: string }[];
}

export function HomeHero({ resorts = [] }: HomeHeroProps) {
  return (
    <section className="home-hero" aria-label="After the Parks home">
      <div className="home-hero__media" aria-hidden>
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/hero/tropical-resort-sunset-mobile.webp"
          />
          <img
            src="/images/hero/tropical-resort-sunset.webp"
            srcSet="/images/hero/tropical-resort-sunset.webp 1920w, /images/hero/tropical-resort-sunset-2x.webp 2400w"
            sizes="100vw"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="home-hero__image"
          />
        </picture>
      </div>

      <div className="home-hero__overlay" aria-hidden />

      <LagoonHeroEasterEgg>
        <div className="hero-content">
          <p className="eyebrow">Sunshine to Starlight</p>
          <h1>Find the magic between park days.</h1>
          <p className="hero-copy">
            Discover resort activities, movies, campfires, crafts, poolside fun, and
            free moments happening during your stay.
          </p>
          <QuickFinder resorts={resorts} />
        </div>
      </LagoonHeroEasterEgg>
    </section>
  );
}
