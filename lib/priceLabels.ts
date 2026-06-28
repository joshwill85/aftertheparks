import type { ActivityOccurrence } from "@/lib/types/occurrence";

export type PublicPriceLabel = "Free" | "Paid";

export function publicPriceLabel(
  state: ActivityOccurrence["price"]["state"] | undefined
): PublicPriceLabel | undefined {
  if (state === "free") return "Free";
  if (state === "fee") return "Paid";
  return undefined;
}

export function optionalPriceAddOnsLabel(
  options: ActivityOccurrence["price"]["options"] | undefined
): string | undefined {
  return Array.isArray(options) && options.length > 0
    ? "Optional add-ons available"
    : undefined;
}

export function formatCentsRange(
  min?: number,
  max?: number
): string | undefined {
  if (min == null && max == null) return undefined;
  const low = min ?? max;
  const high = max ?? min;
  if (low == null || high == null) return undefined;
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value % 100 === 0 ? 0 : 2,
    }).format(value / 100);
  return low === high ? money(low) : `${money(low)}-${money(high)}`;
}

export function publicPriceDetail(
  price: ActivityOccurrence["price"] | undefined
): string | undefined {
  if (!price || price.state !== "fee") return undefined;
  const amount = formatCentsRange(
    price.minAmountCents ?? price.amountCents,
    price.maxAmountCents ?? price.amountCents
  );
  if (!amount) return undefined;
  const basis =
    price.priceBasis === "per_person" ? " per person" : "";
  return `${amount}${basis}`;
}
