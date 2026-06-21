import { getCategoryMeta } from "@/lib/categories/meta";
import { cn } from "@/lib/utils";

const CATEGORY_GRADIENTS: Record<string, string> = {
  poolside: "from-[#4ec4d4] to-[#2f6f4e]",
  campfire: "from-[#fdb94e] to-[#f36f5c]",
  movies_under_stars: "from-[#071a22] to-[#16a6b6]",
  fitness_wellness: "from-[#ddeedb] to-[#27724b]",
  arts_crafts: "from-[#ff8fb7] to-[#fdb94e]",
  signature: "from-[#ffc857] to-[#08798a]",
  resort_activity: "from-[#4ec4d4] to-[#fdb94e]",
  arcade: "from-[#16a6b6] to-[#071a26]",
  nighttime_entertainment: "from-[#071a26] to-[#ffc857]",
  scavenger_hunt: "from-[#ff9c6b] to-[#27724b]",
  nature: "from-[#27724b] to-[#16a6b6]",
  music: "from-[#ffc857] to-[#f36f5c]",
  other: "from-[#fdb94e] to-[#ff9c6b]",
};

interface CategoryIconProps {
  category: string;
  className?: string;
  size?: "sm" | "md";
  showStamp?: boolean;
}

export function CategoryIcon({
  category,
  className,
  size = "md",
  showStamp = true,
}: CategoryIconProps) {
  const meta = getCategoryMeta(category);
  const gradient = CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.other;

  return (
    <div
      className={cn(
        "icon-bubble category-stamp relative grid place-items-center overflow-hidden rounded-[22px] bg-gradient-to-br shadow-inner",
        size === "sm" ? "h-14 w-14" : "h-16 w-16",
        gradient,
        className
      )}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.75),transparent_36%)]"
        aria-hidden
      />
      {showStamp && <span className="category-stamp__ring" aria-hidden />}
      <span
        className={cn(
          "relative select-none drop-shadow-sm",
          size === "sm" ? "text-2xl" : "text-3xl"
        )}
        role="img"
        aria-label={meta.label}
      >
        {meta.icon}
      </span>
      {showStamp && size === "md" && (
        <span className="category-stamp__label" aria-hidden>
          {meta.stamp}
        </span>
      )}
    </div>
  );
}
