/** Short date + time for order lists, in the device's locale. */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Day + month, e.g. "15 Sep", in the device's locale. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const RUPEES = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** "₹1,250" / "−₹120" — amounts in rupees. */
export function formatRupees(amount: number): string {
  const sign = amount < 0 ? '−' : '';
  return `${sign}₹${RUPEES.format(Math.abs(amount))}`;
}

/** "1h 25m" / "12 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "2.4 km" / "850 m". */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/** Clock time, e.g. "2:38 pm". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Today, 2:38 pm" / "Yesterday, 9:10 am" / "21 Sep, 6:42 pm". */
export function formatDayTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = formatTime(iso);
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${formatShortDate(iso)}, ${time}`;
}

/** First line of an address label: "Hans Bhawan, Wing-1…" → "Hans Bhawan". */
export function placeName(label: string): string {
  return label.split(',')[0]?.trim() || label;
}

export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
