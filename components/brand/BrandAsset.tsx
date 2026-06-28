import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandAssetKey =
  | "guide-companion"
  | "pocket-map-only"
  | "dark-lockup";

const BRAND_ASSETS: Record<
  BrandAssetKey,
  { src: string; width: number; height: number; alt: string }
> = {
  "guide-companion": {
    src: "/brand/atp-guide-companion-only.svg",
    width: 800,
    height: 800,
    alt: "After the Parks guide companion",
  },
  "pocket-map-only": {
    src: "/brand/atp-pocket-map-only-outlined.svg",
    width: 1200,
    height: 700,
    alt: "After the Parks pocket map",
  },
  "dark-lockup": {
    src: "/brand/atp-pocket-map-dark-lockup-outlined.svg",
    width: 1200,
    height: 1200,
    alt: "After the Parks Pocket Map Companion",
  },
};

interface BrandAssetProps {
  asset: BrandAssetKey;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}

export function BrandAsset({
  asset,
  className,
  priority = false,
  decorative = true,
}: BrandAssetProps) {
  const image = BRAND_ASSETS[asset];

  return (
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={decorative ? "" : image.alt}
      aria-hidden={decorative ? true : undefined}
      priority={priority}
      className={cn("brand-asset", className)}
    />
  );
}

type BrandMarkVariant = "header" | "horizontal" | "primary" | "dark";

const BRAND_MARKS: Record<
  BrandMarkVariant,
  { src: string; width: number; height: number; alt: string }
> = {
  header: {
    src: "/brand/atp-pocket-map-horizontal-lockup-outlined.svg",
    width: 1600,
    height: 650,
    alt: "After the Parks",
  },
  horizontal: {
    src: "/brand/atp-pocket-map-horizontal-lockup-outlined.svg",
    width: 1600,
    height: 650,
    alt: "After the Parks Pocket Map Companion",
  },
  primary: {
    src: "/brand/atp-pocket-map-primary-lockup-outlined.svg",
    width: 1200,
    height: 1200,
    alt: "After the Parks Pocket Map Companion",
  },
  dark: {
    src: "/brand/atp-pocket-map-dark-lockup-outlined.svg",
    width: 1200,
    height: 1200,
    alt: "After the Parks Pocket Map Companion",
  },
};

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
}

export function BrandMark({
  variant = "horizontal",
  className,
  priority = false,
  decorative = false,
}: BrandMarkProps) {
  const image = BRAND_MARKS[variant];

  return (
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={decorative ? "" : image.alt}
      aria-hidden={decorative ? true : undefined}
      priority={priority}
      className={cn("brand-mark", className)}
    />
  );
}

interface BrandMotifProps {
  className?: string;
  decorative?: boolean;
}

export function BrandMotif({ className, decorative = true }: BrandMotifProps) {
  return (
    <Image
      src="/brand/atp-three-waypoint-motif.svg"
      width={512}
      height={512}
      alt={decorative ? "" : "After the Parks route motif"}
      aria-hidden={decorative ? true : undefined}
      className={cn("brand-motif", className)}
    />
  );
}
