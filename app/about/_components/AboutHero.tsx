import Link from "next/link";
import { heroContent } from "../content";
import styles from "../about.module.css";
import { HeroMapScene } from "./AboutIllustrations";

export function AboutHero() {
  return (
    <section className={styles.hero} aria-label="The story behind After the Parks">
      <div className={styles.heroText} data-testid="about-hero-text">
        <h1 aria-label={heroContent.headline}>
          <span>I built</span>
          <span>After the Parks</span>
          <span>because I needed it first.</span>
        </h1>
        <p>{heroContent.subhead}</p>
        <div className={styles.heroActions}>
          <Link href={heroContent.primaryCta.href} className="btn-primary">
            {heroContent.primaryCta.label}
          </Link>
          <Link href={heroContent.secondaryCta.href} className="btn-secondary">
            {heroContent.secondaryCta.label}
          </Link>
        </div>
      </div>
      <div className={styles.heroArt} data-testid="about-hero-art">
        <HeroMapScene />
      </div>
    </section>
  );
}
