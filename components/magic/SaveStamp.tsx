"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function SaveStamp({ itemId }: { itemId: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!EASTER_EGGS) return;
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, [itemId]);

  if (!EASTER_EGGS) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 2, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 0.9, rotate: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--color-citrus)] bg-[var(--color-sand)] text-xs font-bold text-[var(--color-lantern)] shadow-lg"
          aria-hidden
        >
          <span className="text-center leading-tight">
            Orange
            <br />
            Blossom
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
