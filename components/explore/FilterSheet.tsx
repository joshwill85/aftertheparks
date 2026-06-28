"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { FilterFields } from "@/components/explore/FilterRail";
import type { FilterImpact } from "@/lib/explore/filterImpact";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  resorts: { slug: string; name: string }[];
  basePath?: string;
  hideDaypart?: boolean;
  activeCount: number;
  filterImpact: FilterImpact;
  homeResortSlug?: string;
  onClearAll: () => void;
}

export function FilterSheet({
  open,
  onClose,
  resorts,
  basePath = "/activities",
  hideDaypart = false,
  activeCount,
  filterImpact,
  homeResortSlug,
  onClearAll,
}: FilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheetRef = useRef<HTMLDivElement>(null);

  const update = useCallback(
    (key: string | Record<string, string | null>, value?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (typeof key === "string") {
        if (value) params.set(key, value);
        else params.delete(key);
      } else {
        for (const [paramKey, paramValue] of Object.entries(key)) {
          if (paramValue) params.set(paramKey, paramValue);
          else params.delete(paramKey);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [router, searchParams, basePath]
  );

  const clearAll = useCallback(() => {
    onClearAll();
    onClose();
  }, [onClearAll, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const activeResort = searchParams.get("resort");
  const activeCategory = searchParams.get("category");
  const activeDaypart = searchParams.get("daypart");
  const activeDuration = searchParams.get("duration");
  const activeNear = searchParams.get("near");
  const activeTransport = searchParams.get("transport");
  const activeArea = searchParams.get("area");
  const activeWeather = searchParams.get("weather");
  const freeOnly = searchParams.get("free") === "true";
  const reservationOnly = searchParams.get("reservation") === "true";
  const activeTicketRequired = searchParams.get("ticket_required");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 min-[900px]:hidden">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-sheet-title"
            tabIndex={-1}
            className="filter-sheet absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 pb-10 shadow-2xl outline-none"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="filter-sheet__handle" aria-hidden />
            <div className="filter-sheet__header">
              <div>
                <h2 id="filter-sheet-title" className="font-display text-lg font-semibold">
                  Filters
                </h2>
                <p className="text-xs font-bold text-[var(--color-muted)]">
                  {activeCount === 0
                    ? "No filters active"
                    : `${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
                </p>
              </div>
              <div className="filter-sheet__actions">
                <button
                  type="button"
                  onClick={clearAll}
                  className="btn-ghost"
                  disabled={activeCount === 0}
                >
                  Clear all
                </button>
                <button type="button" onClick={onClose} className="btn-primary px-5 text-sm">
                  Apply
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="filter-sheet__close"
                  aria-label="Close filters"
                >
                  <IconGlyph iconKey="close" decorative />
                </button>
              </div>
            </div>

            <FilterFields
              resorts={resorts}
              activeResort={activeResort}
              activeCategory={activeCategory}
              activeDaypart={activeDaypart}
              activeDuration={activeDuration}
              activeNear={activeNear}
              activeTransport={activeTransport}
              activeArea={activeArea}
              activeWeather={activeWeather}
              freeOnly={freeOnly}
              reservationOnly={reservationOnly}
              activeTicketRequired={activeTicketRequired}
              hideDaypart={hideDaypart}
              filterImpact={filterImpact}
              homeResortSlug={homeResortSlug}
              update={update}
              searchableResorts
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
