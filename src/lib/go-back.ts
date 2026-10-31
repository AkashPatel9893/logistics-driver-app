import type { useRouter } from 'expo-router';

/** Goes back, or to Home when the screen was opened without history (a restart, a deep link, a replaced route). */
export function goBack(router: ReturnType<typeof useRouter>): void {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}
