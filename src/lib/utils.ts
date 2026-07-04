import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

export function formatCurrency(value?: number | null, currency = "USD") {
  if (value == null || Number.isNaN(value)) {
    return "TBD";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function id(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
