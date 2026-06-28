import type { SeoFaqItem } from "@/lib/seo/faqs";

export function SeoFaq({
  title = "Common questions",
  items,
}: {
  title?: string;
  items: SeoFaqItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-3 divide-y divide-[var(--color-card-border)]">
        {items.map((item) => (
          <details key={item.question} className="group py-3">
            <summary className="cursor-pointer text-sm font-bold text-[var(--brand-ink)] marker:text-[var(--accent)]">
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
