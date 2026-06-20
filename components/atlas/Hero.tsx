"use client";

import { motion } from "motion/react";
import { useDaypart } from "@/components/atlas/DaypartProvider";
import { LagoonHeroEasterEgg } from "@/components/magic/LagoonHeroEasterEgg";

interface HeroProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function Hero({ title, subtitle, children }: HeroProps) {
  const { daypart } = useDaypart();

  return (
    <section className="relative mb-10 overflow-hidden rounded-3xl border border-[var(--color-card-border)] p-8 md:p-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, var(--hero-glow), transparent 50%),
            radial-gradient(ellipse at 80% 80%, var(--hero-glow), transparent 40%)`,
        }}
      />
      <LagoonHeroEasterEgg>
        <div className="relative">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--accent)]"
          >
            Sunshine to Starlight
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold md:text-5xl"
            style={{
              textShadow:
                daypart === "evening" || daypart === "late"
                  ? "0 0 40px var(--hero-glow)"
                  : undefined,
            }}
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 max-w-xl text-lg text-[var(--color-muted)]"
          >
            {subtitle}
          </motion.p>
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              {children}
            </motion.div>
          )}
        </div>
      </LagoonHeroEasterEgg>
    </section>
  );
}
