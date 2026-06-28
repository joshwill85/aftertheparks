import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto border-t border-[var(--border-soft)] px-4 py-8 pb-24 md:pb-8">
      <span
        className="hidden-resort-magic hrm-footer-grain"
        data-hidden-detail="footer_paper_grain_secret"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[var(--muted)] md:flex-row md:justify-between">
        <p className="max-w-xl">
          After the Parks is an independent planning guide and is not affiliated
          with Disney. Always confirm schedules with the official resort source
          before heading out.
        </p>
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
    </footer>
  );
}
