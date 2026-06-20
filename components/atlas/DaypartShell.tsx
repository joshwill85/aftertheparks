"use client";

import { DaypartProvider } from "@/components/atlas/DaypartProvider";
import { SiteFooter, SiteHeader } from "@/components/atlas/SiteChrome";
import { Fireflies } from "@/components/magic/Fireflies";
import { FirstVisitWelcome } from "@/components/magic/FirstVisitWelcome";
import type { Daypart } from "@/lib/types/occurrence";
import type { ReactNode } from "react";

export function DaypartShell({
  children,
  forceDaypart,
}: {
  children: ReactNode;
  forceDaypart?: Daypart;
}) {
  return (
    <DaypartProvider initialForce={forceDaypart ?? null}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
        <Fireflies />
        <FirstVisitWelcome />
      </div>
    </DaypartProvider>
  );
}
