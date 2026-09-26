import { BottomSheet, Host, RNHostView } from '@expo/ui';
import { useWindowDimensions } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { cn } from '@/lib/cn';

import { AppPressable } from './app-pressable';
import { AppText } from './app-text';
import { AppView } from './app-view';

export interface OptionSheetProps {
  isPresented: boolean;
  title: string;
  message?: string;
  options: string[];
  /** Label of the dismiss row. */
  cancelLabel?: string;
  /** Styles the options as a destructive choice (e.g. cancelling a trip). */
  destructive?: boolean;
  onSelect: (option: string) => void;
  onDismiss: () => void;
}

/**
 * Pick-one list in a native bottom sheet. Use instead of `Alert` when there
 * are more than two choices: Android alerts show at most three buttons and
 * silently drop the rest (including the cancel button).
 */
export function OptionSheet({
  isPresented,
  title,
  message,
  options,
  cancelLabel = 'Cancel',
  destructive = false,
  onSelect,
  onDismiss,
}: OptionSheetProps) {
  const surfaceColor = useThemeColor('surface');
  const { width } = useWindowDimensions();

  if (!isPresented) return null;

  return (
    <Host style={{ position: 'absolute', width: '100%', height: '100%' }}>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        showDragIndicator
        contentPadding={0}
        containerColor={surfaceColor}
      >
        {/* RN content must sit in an RNHostView, or Android's sheet never delivers taps. */}
        <RNHostView matchContents>
          <AppView className="w-full bg-surface px-5 pb-8 pt-3" style={{ width }}>
            <AppText accessibilityRole="header" className="text-lg font-bold text-foreground">
              {title}
            </AppText>
            {message ? <AppText className="mt-1 text-[13px] text-muted">{message}</AppText> : null}
            <AppView className="mt-3">
              {options.map((option) => (
                <AppPressable
                  key={option}
                  onPress={() => {
                    onDismiss();
                    onSelect(option);
                  }}
                  accessibilityRole="button"
                  className="w-full border-b border-divider py-4"
                >
                  <AppText
                    className={cn(
                      'text-[15px] font-semibold',
                      destructive ? 'text-danger' : 'text-foreground',
                    )}
                  >
                    {option}
                  </AppText>
                </AppPressable>
              ))}
              <AppPressable onPress={onDismiss} accessibilityRole="button" className="w-full py-4">
                <AppText className="text-center text-[15px] font-bold text-brand-strong">
                  {cancelLabel}
                </AppText>
              </AppPressable>
            </AppView>
          </AppView>
        </RNHostView>
      </BottomSheet>
    </Host>
  );
}
