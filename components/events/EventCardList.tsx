import { cn } from "@/lib/utils";

interface EventCardListProps {
  children: React.ReactNode;
  compact?: boolean;
  columns?: 1 | 2 | 3;
  className?: string;
  as?: "ul" | "div";
}

export function EventCardList({
  children,
  compact = false,
  columns = 1,
  className,
  as: Tag = "ul",
}: EventCardListProps) {
  return (
    <Tag
      className={cn(
        "event-card-list",
        compact && "event-card-list--compact",
        columns === 2 && "event-card-list--cols-2",
        columns === 3 && "event-card-list--cols-3",
        className
      )}
    >
      {children}
    </Tag>
  );
}

interface EventCardListItemProps {
  children: React.ReactNode;
  className?: string;
}

export function EventCardListItem({ children, className }: EventCardListItemProps) {
  return <li className={cn("event-card-list__item", className)}>{children}</li>;
}
