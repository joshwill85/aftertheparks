"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

function skipTarget(pathname: string) {
  if (
    pathname === "/activities" ||
    pathname === "/tonight" ||
    pathname === "/today"
  ) {
    return { href: "#activities", label: "Skip to activities" };
  }
  return { href: "#main-content", label: "Skip to main content" };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skip = skipTarget(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <a href={skip.href} className="skip-link">
        {skip.label}
      </a>
      <Suspense fallback={<header className="site-header" aria-hidden />}>
        <SiteHeader />
      </Suspense>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 outline-none md:pb-8"
      >
        {children}
      </main>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
