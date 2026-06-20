"use client";

import { useCallback, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function LagoonHeroEasterEgg({ children }: { children: ReactNode }) {
  const [taps, setTaps] = useState(0);
  const [showSerial, setShowSerial] = useState(false);

  const handleTap = useCallback(() => {
    if (!EASTER_EGGS) return;
    const next = taps + 1;
    setTaps(next);
    if (next >= 7) {
      setShowSerial(true);
      console.info(
        "[After the Parks] Field note 71 — the best evenings start when the day guests head home."
      );
      setTimeout(() => setShowSerial(false), 2000);
      setTaps(0);
    }
  }, [taps]);

  return (
    <div className="relative cursor-default" onClick={handleTap} role="presentation">
      {children}
      <AnimatePresence>
        {showSerial && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2 right-2 font-mono text-xs text-[var(--color-muted)]"
          >
            71
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
