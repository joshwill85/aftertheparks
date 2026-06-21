import { cn } from "@/lib/utils";

interface EventDetailSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "warm" | "lagoon";
}

export function EventDetailSection({
  title,
  children,
  className,
  tone = "default",
}: EventDetailSectionProps) {
  return (
    <section
      className={cn(
        "event-detail-section",
        tone === "warm" && "event-detail-section--warm",
        tone === "lagoon" && "event-detail-section--lagoon",
        className
      )}
    >
      <h2 className="event-detail-section__title">{title}</h2>
      <div className="event-detail-section__body">{children}</div>
    </section>
  );
}

interface EventDetailFactProps {
  label: string;
  children: React.ReactNode;
}

export function EventDetailFact({ label, children }: EventDetailFactProps) {
  return (
    <div className="event-detail-fact">
      <p className="event-detail-fact__label">{label}</p>
      <div className="event-detail-fact__value">{children}</div>
    </div>
  );
}
