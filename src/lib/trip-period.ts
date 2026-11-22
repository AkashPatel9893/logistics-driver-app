export type TripPeriod = 'day' | 'week' | 'month';

export interface PeriodSlot {
  /** 0 is the current day, week or month; 1 is the one before, and so on. */
  offset: number;
  /** Inclusive start, local time. */
  start: Date;
  /** Exclusive end, local time. */
  end: Date;
  /** Top line of the date chip, e.g. "Sun", "Nov" or "2026". */
  label: string;
  /** Bottom line of the date chip, e.g. "22", "16-22" or "Nov". */
  sub: string;
}

/** How far back the date strip goes. */
export const MAX_OFFSET: Record<TripPeriod, number> = { day: 60, week: 26, month: 12 };

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** The day, Monday-to-Sunday week or calendar month that is `offset` steps before now. */
export function periodSlot(period: TripPeriod, offset: number, now = new Date()): PeriodSlot {
  if (period === 'day') {
    const start = addDays(startOfDay(now), -offset);
    return {
      offset,
      start,
      end: addDays(start, 1),
      label: start.toLocaleDateString(undefined, { weekday: 'short' }),
      sub: String(start.getDate()),
    };
  }
  if (period === 'week') {
    const today = startOfDay(now);
    const sinceMonday = (today.getDay() + 6) % 7;
    const start = addDays(today, -sinceMonday - offset * 7);
    const last = addDays(start, 6);
    return {
      offset,
      start,
      end: addDays(start, 7),
      label: last.toLocaleDateString(undefined, { month: 'short' }),
      sub: `${start.getDate()}-${last.getDate()}`,
    };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return {
    offset,
    start,
    end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
    label: String(start.getFullYear()),
    sub: start.toLocaleDateString(undefined, { month: 'short' }),
  };
}

export function isInSlot(iso: string, slot: PeriodSlot): boolean {
  const time = new Date(iso).getTime();
  return time >= slot.start.getTime() && time < slot.end.getTime();
}

/** Five consecutive slots for the date strip, oldest first, that always include `selected`. */
export function stripOffsets(selected: number): number[] {
  const newest = Math.max(selected - 2, 0);
  return [newest + 4, newest + 3, newest + 2, newest + 1, newest];
}
