"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function FirstVisitWelcome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!EASTER_EGGS) return;
    const key = "atp-welcomed";
    if (!localStorage.getItem(key)) {
      setShow(true);
      localStorage.setItem(key, "1");
      const t = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-4 left-4 z-50 max-w-xs rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 text-sm shadow-lg backdrop-blur-md"
          role="status"
        >
          Welcome back to the resort evening — your guide to life after the parks.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
