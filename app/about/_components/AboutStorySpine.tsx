import type { CSSProperties } from "react";
import { storySections } from "../content";
import styles from "../about.module.css";
import { AboutIcon } from "./AboutIllustrations";

export function AboutStorySpine() {
  return (
    <section id="story" className={styles.story} aria-labelledby="about-story-title">
      <div className={styles.sectionIntro}>
        <p className={styles.mapLabel}>The map that should have existed</p>
        <h2 id="about-story-title">From one staycation to a planning guide.</h2>
      </div>

      <div className={styles.storyTrack}>
        <svg
          className={styles.storyRoute}
          data-testid="about-story-route"
          viewBox="0 0 72 1260"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className={styles.storyRoutePath}
            d="M36 8 C12 96 58 168 34 260 C10 352 58 430 36 526 C14 626 58 712 34 810 C12 906 58 986 36 1084 C24 1144 34 1204 46 1252"
          />
          <path
            className={styles.storyRouteProgress}
            d="M36 8 C12 96 58 168 34 260 C10 352 58 430 36 526 C14 626 58 712 34 810 C12 906 58 986 36 1084 C24 1144 34 1204 46 1252"
            pathLength="1"
          />
          {storySections.map((section, index) => (
            <circle
              className={styles.storyRouteNode}
              cx={index % 2 === 0 ? 34 : 40}
              cy={96 + index * 206}
              key={section.heading}
              r="7"
            />
          ))}
        </svg>
        {storySections.map((section, index) => (
          <article
            className={`${styles.storyItem} ${styles[`artifact_${section.artifact}`]}`}
            data-about-route-step
            data-artifact={section.artifact}
            key={section.heading}
            style={{ "--story-index": index } as CSSProperties}
          >
            <div className={styles.storyMarker} aria-hidden>
              <AboutIcon name={section.icon} />
            </div>
            <div className={styles.storyCopy} data-testid="about-story-copy">
              <div className={styles.storyCardMeta}>
                <p className={styles.mapNote}>{section.mapNote}</p>
                <span>{section.phase}</span>
              </div>
              <h3>{section.heading}</h3>
              <p className={styles.artifactMotif}>{section.motif}</p>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <span className={styles.artifactStamp} aria-hidden>
                {section.stamp}
              </span>
              {section.hingeNote && (
                <aside className={styles.hingeNote} aria-label="Planning note">
                  {section.hingeNote}
                </aside>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
