export function LagoonSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`lagoon-ripple rounded-xl bg-[var(--color-card)]/50 ${className}`}
      aria-hidden
    />
  );
}

export function ActivityGridSkeleton({ columns = 1 }: { columns?: 1 | 2 }) {
  return (
    <div
      className={
        columns === 2 ? "grid gap-4 md:grid-cols-2" : "grid grid-cols-1 gap-4"
      }
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <LagoonSkeleton key={i} className="h-40 rounded-[28px]" />
      ))}
    </div>
  );
}
