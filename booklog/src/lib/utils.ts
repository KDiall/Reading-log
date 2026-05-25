import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function syncProgress(
  input: "page" | "pct",
  value: number,
  pageCount?: number
) {
  if (input === "page" && pageCount) {
    return { page: value, pct: Math.min(100, (value / pageCount) * 100) };
  }
  if (input === "pct" && pageCount) {
    return { page: Math.round((value / 100) * pageCount), pct: value };
  }
  return input === "page"
    ? { page: value, pct: null }
    : { page: null, pct: value };
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
