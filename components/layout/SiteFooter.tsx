import Link from "next/link";
import { BrandAsset, BrandMotif } from "@/components/brand/BrandAsset";

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
          <div className="site-footer__brand">
            <div className="site-footer__brand-row">
              <BrandAsset
                asset="guide-companion"
                className="site-footer__brand-icon"
              />
              <div>
                <p className="site-footer__brand-name">After the Parks</p>
                <p className="site-footer__tagline">
                  Find the magic between park days.
                </p>
              </div>
            </div>
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
            <Link href="/calendar" className="hover:text-[var(--lagoon)]">
              Calendar
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
          Independent planning guide. Not affiliated with Disney. Confirm schedules, access, transportation, and pricing with the official source before you go.
        </p>
      </div>
    </footer>
  );
}
