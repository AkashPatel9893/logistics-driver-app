import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isAutoStartRequested, takeAutoStart } from './next-step';

/** Longer than the push animation of the step another copy of the checklist opens. */
const AUTO_START_COVER_MS = 1000;

/**
 * Right after sign-up, a checklist screen (Documents, Fleet setup) opens the first pending step at
 * once, so a new partner goes through the steps in a row. Opening the app later (resume) shows
 * the list instead. While this returns true, show a spinner: the list must not flash.
 *
 * `ready` is true once the steps are loaded; `route` is the first pending step, if any.
 */
export function useAutoStartStep(ready: boolean, route: string | undefined): boolean {
  const router = useRouter();
  const [holding, setHolding] = useState(isAutoStartRequested);
  const pushedStep = useRef(false);
  const leftForStep = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Back on the list from the step it opened: show the list. Only once the list has lost
      // focus to that step; it can report focus more than once while it first appears.
      if (leftForStep.current) setHolding(false);
      return () => {
        if (pushedStep.current) leftForStep.current = true;
      };
    }, []),
  );

  useEffect(() => {
    // Once only: the step data refreshes after the push and would re-run this.
    if (!holding || !ready || pushedStep.current) return;
    const mine = takeAutoStart();
    if (mine && route) {
      pushedStep.current = true;
      router.push(route as never);
      return;
    }
    // Nothing to open: show the list. If another copy of it is opening the step (sign-up can
    // mount two), keep the spinner until that step has slid over this one.
    const timer = setTimeout(() => setHolding(false), mine ? 0 : AUTO_START_COVER_MS);
    return () => clearTimeout(timer);
  }, [holding, ready, route, router]);

  return holding;
}
