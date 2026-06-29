import Link from "next/link";
import { footerCta } from "../content";
import styles from "../about.module.css";

export function AboutFooterCta() {
  return (
    <section className={styles.footerCta} aria-labelledby="about-footer-cta-title">
      <h2 id="about-footer-cta-title">{footerCta.heading}</h2>
      <div className={styles.footerActions}>
        {footerCta.actions.map((action) => (
          <Link
            href={action.href}
            className={action.variant === "primary" ? "btn-primary" : "btn-secondary"}
            key={action.href}
          >
            {action.label}
          </Link>
        ))}
      </div>
      <p>{footerCta.disclaimer}</p>
    </section>
  );
}
