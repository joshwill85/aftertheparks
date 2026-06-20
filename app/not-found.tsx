import Link from "next/link";
import { FoldedMap404 } from "@/components/magic/FoldedMap404";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <FoldedMap404 />
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        This path isn&apos;t on the map — but the resort activities are.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-[var(--accent)] px-5 py-2.5 text-white"
      >
        Back home
      </Link>
    </div>
  );
}
