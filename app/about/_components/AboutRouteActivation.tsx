"use client";

import { useEffect } from "react";

export function AboutRouteActivation() {
  useEffect(() => {
    const routeStops = Array.from(
      document.querySelectorAll<HTMLElement>("[data-about-route-step]")
    );

    if (routeStops.length === 0) return;

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

    return () => observer.disconnect();
  }, []);

  return null;
}
