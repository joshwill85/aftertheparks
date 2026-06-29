import { messyInputs, messyToMagicContent, organizedOutputs } from "../content";
import styles from "../about.module.css";

function CardList({
  items,
  label,
  tone,
}: {
  items: readonly string[];
  label: string;
  tone: "messy" | "clear";
}) {
  return (
    <div className={styles.magicColumn}>
      <p className={styles.magicColumnLabel}>{label}</p>
      <div className={styles.magicCards}>
        {items.map((item) => (
          <span
            className={`${styles.magicCard} ${
              tone === "clear" ? styles.magicCardClear : styles.magicCardMessy
            }`}
            data-testid="about-messy-card"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AboutMessyToMagic() {
  return (
    <section className={styles.magicSection} aria-labelledby="about-magic-title">
      <div className={styles.magicIntro}>
        <h2 id="about-magic-title">{messyToMagicContent.heading}</h2>
        <p>{messyToMagicContent.body}</p>
      </div>
      <div className={styles.magicBoard}>
        <CardList items={messyInputs} label="Messy inputs" tone="messy" />
        <div className={styles.magicPath} aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <CardList items={organizedOutputs} label="After the Parks output" tone="clear" />
      </div>
    </section>
  );
}
