"use client";

import type { ReactNode } from "react";
import { PlanProvider } from "@/components/atlas/PlanProvider";
import { PlanPreview } from "@/components/plan/PlanPreview";

export function PlanClientBoundary({
  children,
  syncOnMount = false,
  preview = true,
}: {
  children: ReactNode;
  syncOnMount?: boolean;
  preview?: boolean;
}) {
  return (
    <PlanProvider syncOnMount={syncOnMount}>
      {children}
      {preview ? <PlanPreview /> : null}
    </PlanProvider>
  );
}
