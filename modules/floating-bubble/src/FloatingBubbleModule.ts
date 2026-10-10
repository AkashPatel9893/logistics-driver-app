import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

declare class FloatingBubbleModule extends NativeModule {
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  show(title: string, subtitle: string, deepLink: string, highlight: boolean): Promise<boolean>;
  updateOverlay(dataJson: string): Promise<boolean>;
  hide(): Promise<void>;
  bringToFront(deepLink: string): boolean;
}

// Android only: null on iOS, where index.ts turns every call into a no-op.
export default requireOptionalNativeModule<FloatingBubbleModule>('FloatingBubble');
