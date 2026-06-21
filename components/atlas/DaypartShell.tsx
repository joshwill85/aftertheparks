"use client";

import { DaypartProvider } from "@/components/atlas/DaypartProvider";
import { AppShell } from "@/components/layout/AppShell";
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
      <AppShell>{children}</AppShell>
      <Fireflies />
      <FirstVisitWelcome />
    </DaypartProvider>
  );
}
