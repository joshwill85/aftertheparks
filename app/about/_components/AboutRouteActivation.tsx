"use client";

import { useEffect } from "react";

export function AboutRouteActivation() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-about-page]");
    const route = document.querySelector<SVGElement>("[data-testid='about-story-route']");
    const routeStops = Array.from(
      document.querySelectorAll<HTMLElement>("[data-about-route-step]")
    );

    if (!page && routeStops.length === 0) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateRouteProgress = () => {
      frame = 0;

      if (!page || !route || motionQuery.matches) {
        page?.style.setProperty("--about-route-progress", "1");
        return;
      }

      const box = route.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = Math.min(
        1,
        Math.max(0, (viewport * 0.72 - box.top) / Math.max(1, box.height))
      );

      page.style.setProperty("--about-route-progress", progress.toFixed(3));
    };

    const requestRouteProgress = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateRouteProgress);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-route-active");
          }
        }
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: 0.12 }
    );

    for (const stop of routeStops) observer.observe(stop);
    updateRouteProgress();
    window.addEventListener("scroll", requestRouteProgress, { passive: true });
    window.addEventListener("resize", requestRouteProgress);
    motionQuery.addEventListener("change", updateRouteProgress);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestRouteProgress);
      window.removeEventListener("resize", requestRouteProgress);
      motionQuery.removeEventListener("change", updateRouteProgress);
    };
  }, []);

  return null;
}
