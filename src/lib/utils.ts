import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatPercentage(value: number, digits = 0) {
  return `${clamp(value, 0, 100).toFixed(digits)}%`;
}

export function formatScore(value: number, max = 100) {
  return `${clamp(value, 0, max).toFixed(0)}/${max}`;
}

export function formatFindingCount(count: number) {
  if (count === 1) {
    return "1 finding";
  }

  return `${count} findings`;
}
