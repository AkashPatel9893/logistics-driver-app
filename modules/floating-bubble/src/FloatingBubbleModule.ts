import { NativeModule, requireNativeModule } from 'expo-modules-core';

declare class FloatingBubbleModule extends NativeModule {
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  show(title: string, subtitle: string, deepLink: string, highlight: boolean): Promise<boolean>;
  updateOverlay(dataJson: string): Promise<boolean>;
  hide(): Promise<void>;
  bringToFront(deepLink: string): boolean;
}

export default requireNativeModule<FloatingBubbleModule>('FloatingBubble');
