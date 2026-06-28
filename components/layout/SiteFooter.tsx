import Link from "next/link";
import { BrandMark, BrandMotif } from "@/components/brand/BrandAsset";

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto border-t border-[var(--border-soft)] px-4 py-8 pb-24 md:pb-8">
      <span
        className="hidden-resort-magic hrm-footer-grain"
        data-hidden-detail="footer_paper_grain_secret"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-[var(--muted)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <BrandMark variant="horizontal" className="brand-mark--footer" />
            <BrandMotif className="brand-motif--divider" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-[var(--lagoon)]">
              About
            </Link>
            <Link href="/corrections" className="hover:text-[var(--lagoon)]">
              Corrections
            </Link>
            <Link href="/privacy" className="hover:text-[var(--lagoon)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--lagoon)]">
              Terms
            </Link>
            <Link href="/guides" className="hover:text-[var(--lagoon)]">
              Guides
            </Link>
            <Link
              href="/source-and-accuracy-policy"
              className="hover:text-[var(--lagoon)]"
            >
              Sources
            </Link>
          </div>
        </div>
        <p className="max-w-3xl">
          After the Parks is an independent planning guide and is not affiliated
          with Disney. Always confirm schedules with the official resort source
          before heading out.
        </p>
      </div>
    </footer>
  );
}
