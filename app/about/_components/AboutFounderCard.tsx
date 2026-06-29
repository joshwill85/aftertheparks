import { founderContent } from "../content";
import styles from "../about.module.css";
import { ObjectDetailIllustration } from "./AboutIllustrations";

export function AboutFounderCard() {
  return (
    <section
      className={styles.founderCard}
      aria-labelledby="about-founder-title"
      data-about-route-step
    >
      <div className={styles.founderImageSlot}>
        <ObjectDetailIllustration />
      </div>
      <div className={styles.founderCopy}>
        <h2 id="about-founder-title">{founderContent.heading}</h2>
        <p className={styles.founderDescriptor}>{founderContent.descriptor}</p>
        <p>{founderContent.note}</p>
      </div>
    </section>
  );
}
