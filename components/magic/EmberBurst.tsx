"use client";

import { motion, AnimatePresence } from "motion/react";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function EmberBurst({ active }: { active: boolean }) {
  if (!EASTER_EGGS) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed bottom-20 right-8 z-50"
          aria-hidden
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: (Math.random() - 0.5) * 40,
                y: -20 - Math.random() * 30,
                opacity: 0,
              }}
              transition={{ duration: 0.5 }}
              className="absolute h-1.5 w-1.5 rounded-full bg-[var(--color-lantern)]"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
