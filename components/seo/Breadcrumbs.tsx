import Link from "next/link";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav className="mb-5 text-sm font-bold text-[var(--color-muted)]" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href && !isCurrent ? (
                <Link href={item.href} className="text-[var(--accent)] hover:underline">
                  {item.name}
                </Link>
              ) : isCurrent ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <span>{item.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
