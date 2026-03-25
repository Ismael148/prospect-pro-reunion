import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============ Fuseau horaire La Réunion (UTC+4) ============
export const REUNION_TIMEZONE = "Indian/Reunion";

/** Format a date string or Date to La Réunion locale string */
export function formatDateReunion(
  dateInput: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("fr-FR", {
    timeZone: REUNION_TIMEZONE,
    ...options,
  });
}

/** Format a date+time string or Date to La Réunion locale string */
export function formatDateTimeReunion(
  dateInput: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleString("fr-FR", {
    timeZone: REUNION_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/** Get current date/time in Réunion timezone as a Date-like reference */
export function nowReunion(): Date {
  // Create a date string in Réunion timezone and parse it
  const reunionStr = new Date().toLocaleString("en-US", { timeZone: REUNION_TIMEZONE });
  return new Date(reunionStr);
}
