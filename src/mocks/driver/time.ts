/** Local calendar day key, e.g. "2026-09-26". */
export function dayKey(date: Date | number): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function startOfDay(date: Date | number): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const DAY_MS = 24 * 60 * 60_000;
