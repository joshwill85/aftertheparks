export function LagoonSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`lagoon-ripple rounded-xl bg-[var(--color-card)]/50 ${className}`}
      aria-hidden
    />
  );
}

export function ActivityGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <LagoonSkeleton key={i} className="h-48" />
      ))}
    </div>
  );
}
