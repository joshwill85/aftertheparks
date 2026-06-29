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
        {items.map((item, index) => (
          <span
            className={`${styles.magicCard} ${
              tone === "clear" ? styles.magicCardClear : styles.magicCardMessy
            } ${item === "My Plan" ? styles.magicCardHighlight : ""}`}
            data-testid="about-messy-card"
            key={item}
          >
            {tone === "clear" && <span className={styles.magicCardIcon} aria-hidden />}
            {item}
            {tone === "messy" && index === 2 && (
              <span className={styles.foldedCorner} aria-hidden />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AboutMessyToMagic() {
  return (
    <section
      className={styles.magicSection}
      aria-labelledby="about-magic-title"
      data-about-route-step
    >
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
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={styles.magicPlanColumn}>
          <CardList
            items={organizedOutputs}
            label={messyToMagicContent.outputLabel}
            tone="clear"
          />
          <div className={styles.miniPlan} aria-label="Sample evening plan">
            <p>Tonight</p>
            {messyToMagicContent.miniPlan.map((item) => (
              <div className={styles.miniPlanRow} key={`${item.time}-${item.label}`}>
                <span>{item.time}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
