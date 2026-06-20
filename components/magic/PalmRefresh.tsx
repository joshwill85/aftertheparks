"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function PalmRefresh({
  children,
  onRefresh,
}: {
  children: ReactNode;
  onRefresh: () => void;
}) {
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 80) setPulling(true);
  };

  const handleTouchEnd = () => {
    if (pulling) {
      onRefresh();
      setPulling(false);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {pulling && EASTER_EGGS && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 48, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden text-[var(--accent)]"
            aria-hidden
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 4c-2 8-6 12-6 18a6 6 0 0012 0c0-6-4-10-6-18z" opacity="0.6" />
              <path d="M20 8c1 6 3 9 3 14a4 4 0 01-8 0c0-3 1-5 2-8" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
