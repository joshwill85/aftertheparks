"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePlan } from "@/components/atlas/PlanProvider";
import { trackPlanEvent } from "@/lib/plan/analytics";
import { executeTurnstile } from "@/lib/turnstile/browser";
import { cn } from "@/lib/utils";

function previewCopy(count: number): { title: string; subtitle: string } {
  if (count <= 1) {
    return {
      title: "Saved to My Plan",
      subtitle: "Your rest day has its first little spark.",
    };
  }
  if (count === 2) {
    return {
      title: "Your day is taking shape.",
      subtitle: "Two activities are waiting in My Plan.",
    };
  }
  return {
    title: "Your day is taking shape.",
    subtitle: `${count} activities are waiting in My Plan.`,
  };
}

function InterestCapture({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackPlanEvent("plan_email_prompt_shown");
  }, []);

  return (
    <div className="plan-preview-interest mt-4 rounded-2xl border border-[var(--border-soft)] bg-white/80 p-4">
      <p className="font-display text-sm font-semibold text-[var(--brand-ink)]">
        Want account save later?
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Leave your email and we&apos;ll tell you when cross-device save is ready.
        Your plan stays on this device for now.
      </p>
      <form
        className="mt-3 space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setStatus(null);
          try {
            const turnstileToken = await executeTurnstile("plan_interest");
            const res = await fetch("/api/plan/interest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                marketingConsent: marketing,
                turnstileToken,
                source: "plan_preview",
              }),
            });
            const data = await res.json();
            setStatus(data.message ?? "Thanks — we will be in touch.");
            trackPlanEvent("plan_email_submitted");
          } finally {
            setLoading(false);
          }
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-full border border-[var(--border-soft)] px-4 py-2.5 text-sm"
          autoComplete="email"
        />
        <label className="flex items-start gap-2 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Send me occasional After the Parks planning ideas and activity
            updates.
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary rounded-full px-4 py-2 text-xs font-bold text-white"
          >
            {loading ? "Sending…" : "Notify me"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--brand-ink)]"
          >
            Not now
          </button>
        </div>
        {status && (
          <p className="text-xs text-[var(--lagoon-deep)]" role="status">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}

function PreviewContent({ onClose }: { onClose: () => void }) {
  const {
    items,
    itemCount,
    lastSavedId,
    syncStatus,
    interestPromptDismissed,
    dismissInterestPrompt,
  } = usePlan();

  const savedItem =
    items.find((i) => i.id === lastSavedId) ?? items[items.length - 1];
  const copy = previewCopy(itemCount);

  return (
    <>
      <div className="plan-preview__header flex items-start justify-between gap-3">
        <div>
          <p
            id="plan-preview-title"
            className="font-display text-lg font-semibold text-[var(--brand-ink)]"
          >
            {copy.title}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="plan-preview__close rounded-full p-2 text-[var(--muted)] hover:bg-black/5"
          aria-label="Close My Plan preview"
        >
          ✕
        </button>
      </div>

      {savedItem && (
        <div
          className="plan-preview__highlight mt-4 rounded-2xl border border-[var(--border-soft)] bg-white/90 p-4 shadow-sm"
          id="plan-preview-saved-item"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--lagoon-deep)]">
            Just saved
          </p>
          <p className="mt-1 font-display text-base font-semibold">
            {savedItem.title}
          </p>
          <p className="text-sm text-[var(--muted)]">{savedItem.resortName}</p>
        </div>
      )}

      {syncStatus === "offline" && (
        <p className="mt-3 text-xs text-[var(--muted)]" role="status">
          Saved on this device. We&apos;ll sync when we can — your plan is safe
          here.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/plan"
          className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold text-white"
          onClick={onClose}
        >
          View My Plan
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Keep browsing
        </button>
      </div>

      {!interestPromptDismissed && itemCount > 0 && (
        <InterestCapture onDismiss={dismissInterestPrompt} />
      )}
    </>
  );
}

export function PlanPreview() {
  const { previewOpen, closePreview, itemCount } = usePlan();
  const statusId = useId();
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen, closePreview]);

  return (
    <>
      <div id={statusId} className="sr-only" aria-live="polite" aria-atomic>
        {previewOpen && itemCount > 0
          ? `Saved to My Plan. ${itemCount} activities saved.`
          : ""}
      </div>

      <AnimatePresence>
        {previewOpen && (
          <>
            <motion.button
              type="button"
              className="plan-preview-backdrop fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] min-[900px]:bg-black/10"
              aria-label="Close My Plan preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              onClick={closePreview}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-preview-title"
              className={cn(
                "plan-preview fixed z-[70] flex flex-col bg-[var(--color-sun-cream)] shadow-2xl",
                "inset-x-0 bottom-0 max-h-[65vh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-[var(--border-soft)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
                "min-[900px]:inset-y-0 min-[900px]:right-0 min-[900px]:left-auto min-[900px]:top-24 min-[900px]:max-h-[calc(100vh-7rem)] min-[900px]:w-[min(420px,calc(100vw-2rem))] min-[900px]:rounded-l-3xl min-[900px]:rounded-tr-none min-[900px]:border min-[900px]:border-r-0"
              )}
              initial={
                reducedMotion
                  ? false
                  : { y: "100%", x: 0, opacity: 1 }
              }
              animate={{ y: 0, x: 0, opacity: 1 }}
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { y: "100%", opacity: 1 }
              }
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/10 min-[900px]:hidden" />
              <PreviewContent onClose={closePreview} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
