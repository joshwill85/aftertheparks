import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteGateForm } from "@/app/site-gate/SiteGateForm";

export const metadata: Metadata = {
  title: "Preview access",
  robots: { index: false, follow: false, noarchive: true },
};

export default function SiteGatePage() {
  return (
    <div className="site-gate flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="site-gate__card w-full max-w-md rounded-3xl border border-[var(--border-soft)] bg-white/90 p-8 shadow-lg">
        <p className="font-display text-center text-2xl font-bold text-[var(--brand-ink)]">
          After the Parks is getting ready.
        </p>
        <p className="mt-3 text-center text-sm text-[var(--muted)]">
          Enter the preview password to continue.
        </p>
        <Suspense fallback={<p className="mt-8 text-center text-sm text-[var(--muted)]">Loading…</p>}>
          <SiteGateForm />
        </Suspense>
      </div>
    </div>
  );
}
