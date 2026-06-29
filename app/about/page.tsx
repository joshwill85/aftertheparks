import type { Metadata } from "next";
import { AboutFooterCta } from "./_components/AboutFooterCta";
import { AboutFounderCard } from "./_components/AboutFounderCard";
import { AboutHero } from "./_components/AboutHero";
import { AboutMessyToMagic } from "./_components/AboutMessyToMagic";
import { AboutRouteActivation } from "./_components/AboutRouteActivation";
import { AboutStorySpine } from "./_components/AboutStorySpine";
import { AboutSouvenirMarks } from "./_components/AboutSouvenirMarks";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "The Story Behind After the Parks",
  description:
    "How one Orlando dad turned a family Fort Wilderness staycation, scattered resort calendars, and too many PDFs into After the Parks.",
};

export default function AboutPage() {
  return (
    <div className={styles.page} data-about-page>
      <AboutRouteActivation />
      <AboutSouvenirMarks />
      <AboutHero />
      <AboutStorySpine />
      <AboutMessyToMagic />
      <AboutFounderCard />
      <AboutFooterCta />
    </div>
  );
}
