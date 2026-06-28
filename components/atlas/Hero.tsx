"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { LagoonHeroEasterEgg } from "@/components/magic/LagoonHeroEasterEgg";

interface HeroProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children?: React.ReactNode;
  image?: boolean;
  dark?: boolean;
  compactBrowse?: boolean;
}

export function Hero({
  title,
  subtitle,
  eyebrow = "Sunshine to Starlight",
  children,
  image = false,
  dark = false,
  compactBrowse = false,
}: HeroProps) {
  const isOverlayText = dark || image;

  return (
    <section
      className={`relative mb-10 overflow-hidden rounded-3xl border border-[var(--color-card-border)] ${
        compactBrowse
          ? "browse-hero-compact p-6 md:p-10"
          : image
            ? "min-h-[320px] md:min-h-[380px]"
            : "p-8 md:p-12"
      }`}
    >
      {image && (
        <>
          <Image
            src="/images/hero-sunshine-starlight.png"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1200px) 100vw, 1152px"
          />
          <div className="hero-image-overlay absolute inset-0" aria-hidden />
        </>
      )}

      {!image && (
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, var(--hero-glow), transparent 50%),
              radial-gradient(ellipse at 80% 80%, var(--hero-glow), transparent 40%)`,
          }}
        />
      )}

      <LagoonHeroEasterEgg>
        <div
          className={`relative ${image ? "flex min-h-[320px] flex-col justify-end p-8 md:min-h-[380px] md:p-12" : ""} ${
            isOverlayText ? "text-white" : ""
          }`}
        >
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-2 text-sm font-medium uppercase tracking-widest ${
              isOverlayText ? "text-[var(--color-lantern)]" : "text-[var(--accent)]"
            }`}
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display max-w-3xl text-4xl font-bold leading-tight md:text-5xl"
            style={{
              textShadow: isOverlayText ? "0 2px 24px rgba(0,0,0,0.35)" : undefined,
            }}
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mt-4 max-w-2xl text-lg ${
              isOverlayText ? "text-white/85" : "text-[var(--color-muted)]"
            }`}
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
