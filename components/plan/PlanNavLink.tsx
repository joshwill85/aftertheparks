"use client";

import Link from "next/link";
import { useLocalPlanCount } from "@/components/plan/useLocalPlanCount";
import { cn } from "@/lib/utils";

interface PlanNavLinkProps {
  href?: string;
  className?: string;
  onClick?: () => void;
  "aria-current"?: "page" | boolean;
}

export function PlanNavLink({
  href = "/plan",
  className,
  onClick,
  "aria-current": ariaCurrent,
}: PlanNavLinkProps) {
  const itemCount = useLocalPlanCount();
  const label =
    itemCount > 0 ? `My Plan · ${itemCount}` : "My Plan";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(className)}
      aria-label={label}
      aria-current={ariaCurrent}
    >
      <span className="plan-nav-label" data-count={itemCount}>
        {itemCount > 0 ? (
          <>
            My Plan <span className="plan-nav-count">· {itemCount}</span>
          </>
        ) : (
          "My Plan"
        )}
      </span>
    </Link>
  );
}
