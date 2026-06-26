import Image from "next/image";

const HERO_MOBILE = "/images/hero/tropical-resort-sunset-mobile.webp";
const HERO_DESKTOP = "/images/hero/tropical-resort-sunset.webp";

export function HomeHeroImage() {
  return (
    <div className="home-hero__media" aria-hidden>
      <Image
        src={HERO_MOBILE}
        alt=""
        fill
        priority
        fetchPriority="high"
        quality={82}
        sizes="(max-width: 767px) 100vw, 1px"
        className="home-hero__image home-hero__image--mobile"
      />
      <Image
        src={HERO_DESKTOP}
        alt=""
        fill
        priority
        fetchPriority="high"
        quality={85}
        sizes="(min-width: 768px) 100vw, 1px"
        className="home-hero__image home-hero__image--desktop"
      />
    </div>
  );
}
