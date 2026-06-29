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
        <div className={styles.storyRoute} data-testid="about-story-route" aria-hidden />
        {storySections.map((section) => (
          <article className={styles.storyItem} key={section.heading}>
            <div className={styles.storyMarker} aria-hidden>
              <AboutIcon name={section.icon} />
            </div>
            <div className={styles.storyCopy} data-testid="about-story-copy">
              <p className={styles.mapNote}>{section.mapNote}</p>
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
