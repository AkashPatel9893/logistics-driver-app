import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

/** The pull indicator belongs only to a user-initiated refresh, not background refetches. */
export function usePullToRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = async (work: () => Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        work(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Refresh is taking too long.')), 20_000);
        }),
      ]);
    } catch {
      if (mounted.current) Alert.alert('Could not refresh', 'Check your connection and try again.');
    } finally {
      if (timer) clearTimeout(timer);
      busy.current = false;
      if (mounted.current) setRefreshing(false);
    }
  };

  return { refreshing, refresh };
}
