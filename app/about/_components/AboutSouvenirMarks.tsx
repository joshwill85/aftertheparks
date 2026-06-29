import type { CSSProperties } from "react";
import { souvenirMarks } from "../content";
import styles from "../about.module.css";

export function AboutSouvenirMarks() {
  return (
    <div className={styles.souvenirLayer} aria-hidden>
      {souvenirMarks.map((mark, index) => (
        <span
          className={styles.souvenirMark}
          data-souvenir={mark.name}
          key={mark.name}
          style={{ "--souvenir-index": index } as CSSProperties}
        >
          {mark.name === "tonight-note" ? "Tonight?" : ""}
        </span>
      ))}
    </div>
  );
}
