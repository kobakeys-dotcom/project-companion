/**
 * Mirrors the SQL function `public.leave_eligibility(employee_id)`.
 * Rule: employees become eligible 2 years after their joining date
 * (or `createdAt` as fallback). Each leave window lasts 2 years and
 * any unused balance expires 3 months after the window closes.
 */
import { addDays, addMonths, addYears, differenceInCalendarMonths } from "date-fns";

export interface LeaveEligibility {
  anchorDate: Date;
  eligibleFrom: Date;
  windowStart: Date;
  windowEnd: Date;
  expiryDate: Date;
  isEligible: boolean;
  isExpired: boolean;
  cycleNumber: number;
  /** Days until the current window's balance expires (negative = already expired). */
  daysUntilExpiry: number;
}

export function computeLeaveEligibility(
  startDateIso?: string | null,
  createdAtIso?: string | null,
  today: Date = new Date(),
): LeaveEligibility | null {
  const anchorIso = startDateIso ?? createdAtIso;
  if (!anchorIso) return null;

  const anchor = new Date(anchorIso);
  if (isNaN(anchor.getTime())) return null;

  const eligibleFrom = addYears(anchor, 2);
  const t = stripTime(today);
  const ef = stripTime(eligibleFrom);

  if (t < ef) {
    const windowEnd = addDays(addMonths(ef, 3), -1);
    const expiry = windowEnd;
    return {
      anchorDate: anchor,
      eligibleFrom: ef,
      windowStart: ef,
      windowEnd,
      expiryDate: expiry,
      isEligible: false,
      isExpired: false,
      cycleNumber: 1,
      daysUntilExpiry: daysBetween(t, expiry),
    };
  }

  // Each cycle: eligible for 3 months, then a fresh 2-year wait until next eligibility.
  // Cycle length = 2 years (next eligibility) but window is only the first 3 months.
  const monthsSince = differenceInCalendarMonths(t, ef);
  const cycle = Math.floor(monthsSince / 24) + 1;
  const windowStart = addYears(ef, (cycle - 1) * 2);
  const windowEnd = addDays(addMonths(windowStart, 3), -1);
  const expiry = windowEnd;

  return {
    anchorDate: anchor,
    eligibleFrom: ef,
    windowStart,
    windowEnd,
    expiryDate: expiry,
    isEligible: t <= expiry,
    isExpired: t > expiry,
    cycleNumber: cycle,
    daysUntilExpiry: daysBetween(t, expiry),
  };
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
