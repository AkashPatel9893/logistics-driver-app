import FloatingBubble from './src/FloatingBubbleModule';
import type {
  BubbleActiveJobItem,
  BubbleContent,
  BubbleOfferItem,
  BubbleOverlayData,
} from './src/FloatingBubble.types';

export type { BubbleActiveJobItem, BubbleContent, BubbleOfferItem, BubbleOverlayData };

/** True where the platform supports a floating bubble (Android). */
export const isBubbleSupported = FloatingBubble !== null;

/** Whether "Display over other apps" is granted. Always false where unsupported. */
export function canDrawOverlays(): boolean {
  return FloatingBubble?.canDrawOverlays() ?? false;
}

/** Opens the system screen where the driver grants "Display over other apps". */
export function openOverlaySettings(): void {
  FloatingBubble?.openOverlaySettings();
}

/** Shows or updates the bubble. Resolves false if it could not be shown. */
export async function showBubble(content: BubbleContent): Promise<boolean> {
  if (!FloatingBubble) return false;
  return FloatingBubble.show(
    content.title,
    content.subtitle,
    content.deepLink,
    content.highlight ?? false,
  );
}

/** Updates the full floating bubble overlay state (requests list, active job, etc.). */
export async function updateBubbleOverlay(data: BubbleOverlayData): Promise<boolean> {
  if (!FloatingBubble) return false;
  return FloatingBubble.updateOverlay(JSON.stringify(data));
}

export async function hideBubble(): Promise<void> {
  await FloatingBubble?.hide();
}

/** Brings the app to the front on a deep link (needs the overlay permission). */
export function bringAppToFront(deepLink: string): boolean {
  return FloatingBubble?.bringToFront(deepLink) ?? false;
}
