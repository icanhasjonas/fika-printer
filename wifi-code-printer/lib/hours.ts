/**
 * Opening hours utilities
 *
 * Calculates closing times and formats voucher note metadata.
 */

import { format, parse, setHours, setMinutes, setSeconds, setMilliseconds, isAfter } from "date-fns";
import { TZDate } from "@date-fns/tz";

export interface HoursConfig {
  closingTime: string;      // "19:00"
  closedDays: string[];     // ["sun"]
  timezone: string;         // "Asia/Bangkok"
}

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Get today's closing time as a Date, or null if closed/past closing.
 */
export function getClosingTime(config: HoursConfig, now?: Date): Date | null {
  const local = new TZDate(now ?? new Date(), config.timezone);
  const dayName = DAY_NAMES[local.getDay()];

  if (config.closedDays.includes(dayName)) return null;

  const [h, m] = config.closingTime.split(":").map(Number);
  const closing = setMilliseconds(setSeconds(setMinutes(setHours(local, h), m), 0), 0);

  if (isAfter(local, closing)) return null;

  return closing;
}

/**
 * Format closing time for voucher note: "fika:closes:2026-03-18T19:00"
 */
export function formatClosingNote(closingTime: Date, config: HoursConfig): string {
  const local = new TZDate(closingTime, config.timezone);
  return `fika:closes:${format(local, "yyyy-MM-dd'T'HH:mm")}`;
}

/**
 * Format closing time for receipt display: "19:00"
 */
export function formatClosingDisplay(closingTime: Date, config: HoursConfig): string {
  const local = new TZDate(closingTime, config.timezone);
  return format(local, "HH:mm");
}

/**
 * Parse closing time from voucher note.
 * Returns a Date comparable with new Date().
 */
export function parseClosingNote(note: string, timezone?: string): Date | null {
  const match = note.match(/fika:closes:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (!match) return null;

  if (timezone) {
    const parsed = parse(match[1], "yyyy-MM-dd'T'HH:mm", new TZDate(new Date(), timezone));
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const d = new Date(match[1]);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Check if today is a closed day.
 */
export function isClosedDay(config: HoursConfig, now?: Date): boolean {
  const local = new TZDate(now ?? new Date(), config.timezone);
  return config.closedDays.includes(DAY_NAMES[local.getDay()]);
}
