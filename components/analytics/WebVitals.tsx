"use client";

import { useEffect } from "react";

type MetricName = "LCP" | "FID" | "CLS" | "INP" | "FCP" | "TTFB";

function reportMetric(name: MetricName, value: number) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[Web Vitals] ${name}:`, Math.round(value));
  }

  if (typeof window !== "undefined" && "gtag" in window) {
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", name, {
      event_category: "Web Vitals",
      value: Math.round(name === "CLS" ? value * 1000 : value),
      non_interaction: true,
    });
  }
}

export function WebVitals() {
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
      return;
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number;
          loadTime?: number;
        };
        const value = last.renderTime ?? last.loadTime ?? last.startTime;
        reportMetric("LCP", value);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const layoutShift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          };
          if (!layoutShift.hadRecentInput) {
            cls += layoutShift.value ?? 0;
          }
        }
        reportMetric("CLS", cls);
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });

      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav) {
        reportMetric("TTFB", nav.responseStart - nav.requestStart);
      }
    } catch {
      /* observers unavailable */
    }
  }, []);

  return null;
}
