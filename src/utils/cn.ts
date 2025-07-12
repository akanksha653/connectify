import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind classes intelligently with clsx and tailwind-merge
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
