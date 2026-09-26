import { AppImage, AppPressable, AppText, AppView, Icon } from '@/components/ui';

export interface PhotoUploadBoxProps {
  label?: string;
  title?: string;
  hint?: string;
  photoUri?: string | null;
  onSelectPhoto?: () => void;
  className?: string;
  variant?: 'dashed' | 'compact';
}

export function PhotoUploadBox({
  label,
  title,
  hint = 'Tap to upload or take photo',
  photoUri,
  onSelectPhoto,
  className = '',
  variant = 'dashed',
}: PhotoUploadBoxProps) {
  const isCompact = variant === 'compact';

  return (
    <AppView className={`w-full ${className}`}>
      {label ? (
        <AppText className="mb-2 text-[14px] font-semibold text-foreground">{label}</AppText>
      ) : null}

      {photoUri ? (
        <AppPressable
          onPress={onSelectPhoto}
          className="relative h-44 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <AppImage source={{ uri: photoUri }} contentFit="cover" className="h-full w-full" />
          <AppView className="absolute inset-0 items-center justify-center bg-black/30">
            <AppView
              row
              className="items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-sm"
            >
              <Icon name="camera" size={16} tone="brand" />
              <AppText className="text-[13px] font-bold text-foreground">Change Photo</AppText>
            </AppView>
          </AppView>
        </AppPressable>
      ) : isCompact ? (
        <AppPressable
          onPress={onSelectPhoto}
          pressScale={0.97}
          className="flex-row items-center gap-3.5 rounded-2xl border border-border/70 bg-[#F9F9FB] dark:bg-card/60 p-3.5"
        >
          <AppView className="h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-white dark:bg-card shadow-xs">
            <Icon name="camera" size={20} tone="brand" />
          </AppView>
          <AppView className="flex-1">
            <AppText className="text-[15px] font-bold text-foreground">
              {title || 'Take photo and upload'}
            </AppText>
            <AppText className="mt-0.5 text-[12px] leading-4 text-muted">{hint}</AppText>
          </AppView>
        </AppPressable>
      ) : (
        <AppPressable
          onPress={onSelectPhoto}
          className="h-40 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/60 active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <AppView className="items-center p-4">
            <AppView className="mb-2.5 h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Icon name="camera" size={24} tone="brand" />
            </AppView>
            <AppText className="text-[14px] font-bold text-foreground">Upload Document</AppText>
            <AppText className="mt-1 text-center text-[12px] text-muted">{hint}</AppText>
          </AppView>
        </AppPressable>
      )}
    </AppView>
  );
}
