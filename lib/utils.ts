import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getCategoryMeta } from "@/lib/categories/meta";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCategory(category: string): string {
  return getCategoryMeta(category).label;
}

export function formatResortTier(category: string): string {
  const map: Record<string, string> = {
    value: "Value",
    moderate: "Moderate",
    deluxe: "Deluxe",
    deluxe_villa: "Villa",
    campground: "Campground",
  };
  return map[category] ?? category;
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
