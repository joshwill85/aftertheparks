import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickLinkProps {
  href: string;
  label: string;
  description?: string;
  variant?: "primary" | "secondary";
}

export function QuickLink({
  href,
  label,
  description,
  variant = "primary",
}: QuickLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl px-5 py-3 text-sm font-medium transition-all",
        variant === "primary"
          ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/25 hover:brightness-110"
          : "border border-[var(--color-card-border)] bg-[var(--color-card)] hover:border-[var(--accent)]"
      )}
    >
      <span className="block">{label}</span>
      {description && (
        <span className="mt-0.5 block text-xs font-normal opacity-80">
          {description}
        </span>
      )}
    </Link>
  );
}
