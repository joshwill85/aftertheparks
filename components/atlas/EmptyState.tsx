import Link from "next/link";
import { BrandAsset } from "@/components/brand/BrandAsset";

interface EmptyStateProps {
  title: string;
  description: string;
  actions?: { label: string; href: string; variant?: "primary" | "secondary" }[];
}

export function EmptyState({ title, description, actions = [] }: EmptyStateProps) {
  return (
    <div className="journal-empty postcard-texture p-8 text-center md:p-12">
      <BrandAsset asset="guide-companion" className="brand-asset--empty" />
      <h2 className="font-display mt-4 text-xl font-semibold md:text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-[var(--color-muted)]">{description}</p>
      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.variant === "primary"
                  ? "btn-primary px-5 text-sm"
                  : "btn-secondary text-sm"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
