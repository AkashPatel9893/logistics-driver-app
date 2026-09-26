import { useNow } from './use-now';

/** Whole seconds left until `deadline` (ISO), never negative. */
export function useCountdown(deadline: string | null | undefined): number {
  const now = useNow(1_000);
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1_000));
}
