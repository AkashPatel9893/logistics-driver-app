import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppImage, AppPressable, AppText, AppView, Button, Icon } from '@/components/ui';

import type { StepState } from './registration-steps';

// ─── Photo slot ─────────────────────────────────────────────────────────────

export interface DocPhotoSlotProps {
  /** e.g. "Front side of your DL". */
  title: string;
  hint?: string;
  uri: string | null;
  onPick: () => void;
  disabled?: boolean;
}

/** A dashed box that becomes the photo preview with a Retake chip once a photo is chosen. */
export function DocPhotoSlot({ title, hint, uri, onPick, disabled }: DocPhotoSlotProps) {
  if (uri) {
    return (
      <AppPressable
        onPress={onPick}
        disabled={disabled}
        accessibilityLabel={`${title} added. Retake photo`}
        className="h-44 w-full overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <AppImage source={{ uri }} contentFit="cover" className="h-full w-full" />
        <AppView
          row
          className="absolute right-3 top-3 gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-sm"
        >
          <Icon name="pencil" size={13} color="#2563eb" />
          <AppText className="text-[12px] font-bold text-[#2563eb]">Retake</AppText>
        </AppView>
        <AppView className="absolute bottom-0 left-0 right-0 bg-black/45 px-3 py-1.5">
          <AppText className="text-[12px] font-semibold text-white">{title}</AppText>
        </AppView>
      </AppPressable>
    );
  }

  return (
    <AppView className="w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface/60 px-4 py-6">
      <AppText className="text-center text-[14px] font-semibold text-foreground">{title}</AppText>
      {hint ? <AppText className="-mt-2 text-center text-[12px] text-muted">{hint}</AppText> : null}
      <AppPressable
        onPress={onPick}
        disabled={disabled}
        pressScale={0.97}
        accessibilityLabel={`Upload ${title}`}
        className="w-full flex-row items-center justify-center gap-2 rounded-full bg-brand py-3"
      >
        <Icon name="camera" size={17} tone="brand-foreground" />
        <AppText className="text-[14px] font-bold text-brand-foreground">Upload photo</AppText>
      </AppPressable>
    </AppView>
  );
}

// ─── Tips list ──────────────────────────────────────────────────────────────

export function TipsCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <AppView className="gap-2 rounded-2xl border border-border/80 bg-surface p-4">
      <AppText className="text-[13px] font-bold text-foreground">{title}</AppText>
      {tips.map((tip) => (
        <AppView key={tip} row className="items-start gap-2">
          <Icon name="checkmark.circle.fill" size={15} tone="success" />
          <AppText className="flex-1 text-[12px] leading-4 text-muted">{tip}</AppText>
        </AppView>
      ))}
    </AppView>
  );
}

// ─── Current status banner on a document screen ─────────────────────────────

export function DocumentStatusNote({
  state,
  masked,
  expiry,
  reason,
  replacing,
}: {
  state: StepState;
  /** A verified document opened to be replaced. */
  replacing?: boolean;
  masked?: string | null;
  /** ISO date on file, shown as DD/MM/YYYY. */
  expiry?: string | null;
  reason?: string | null;
}) {
  if (state === 'todo' || state === 'selected') return null;
  const tone =
    state === 'verified'
      ? { box: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' }
      : state === 'rejected'
        ? { box: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' }
        : { box: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' };
  const message =
    state === 'verified'
      ? replacing
        ? 'Verified. A new one will be checked again.'
        : 'Verified. You do not need to upload this again.'
      : state === 'rejected'
        ? `Please upload again${reason ? `: ${reason}` : '.'}`
        : 'Under verification. What you sent is shown below: change anything and tap Update.';
  const onFile = [
    masked,
    expiry ? `valid till ${expiry.split('-').reverse().join('/')}` : null,
  ].filter(Boolean);
  return (
    <AppView className={`rounded-2xl px-4 py-3 ${tone.box}`}>
      <AppText className={`text-[13px] font-semibold ${tone.text}`}>
        {onFile.length > 0 ? `On file: ${onFile.join(' · ')}\n` : ''}
        {message}
      </AppText>
    </AppView>
  );
}

// ─── Photos sent from this phone, read-only ─────────────────────────────────

/** The photos last submitted from this phone, if it still has them (the backend can't send them). */
export function SubmittedPhotos({ uris }: { uris: (string | null)[] }) {
  const photos = uris.filter((u): u is string => Boolean(u));
  if (photos.length === 0) return null;
  return (
    <AppView className="gap-3">
      <AppText className="text-[13px] font-bold text-foreground-secondary">Photos you sent</AppText>
      <AppView row className="gap-3">
        {photos.map((uri) => (
          <AppImage
            key={uri}
            source={{ uri }}
            contentFit="cover"
            className="h-28 flex-1 rounded-2xl border border-border"
          />
        ))}
      </AppView>
    </AppView>
  );
}

// ─── Sticky footer with the primary button ──────────────────────────────────

export function StickyFooter({
  label,
  onPress,
  disabled,
  loading,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <AppView
      style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}
      className="gap-2 border-t border-border/80 bg-background px-5 pt-3"
    >
      {children}
      <Button
        variant="brand"
        label={label}
        onPress={onPress}
        disabled={disabled}
        loading={loading}
        size="lg"
        textClassName="font-extrabold text-base"
      />
    </AppView>
  );
}

// ─── Step row on the Documents screen ───────────────────────────────────────

export function StepStatusIcon({ state }: { state: StepState }) {
  if (state === 'verified' || state === 'selected') {
    return <Icon name="checkmark.circle.fill" size={22} tone="success" />;
  }
  if (state === 'review') {
    return (
      <AppView className="h-[22px] w-[22px] items-center justify-center rounded-full bg-amber-500">
        <AppText className="text-[13px] font-black text-white">!</AppText>
      </AppView>
    );
  }
  if (state === 'rejected') {
    return <Icon name="exclamationmark.triangle.fill" size={20} color="#dc2626" />;
  }
  return null;
}

export interface StepRowProps {
  title: string;
  detail: string | null;
  state: StepState;
  /** The next step to do: drawn filled so the driver knows where to tap. */
  highlighted?: boolean;
  optional?: boolean;
  onPress: () => void;
}

export function StepRow({ title, detail, state, highlighted, optional, onPress }: StepRowProps) {
  const detailColor =
    state === 'review'
      ? 'text-amber-600 dark:text-amber-400'
      : state === 'rejected'
        ? 'text-red-600 dark:text-red-400'
        : state === 'verified'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted';

  return (
    <AppPressable
      onPress={onPress}
      pressScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${title}${detail ? `, ${detail}` : ''}`}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${
        highlighted ? 'bg-brand shadow-md' : 'border border-border/80 bg-surface shadow-sm'
      }`}
    >
      <StepStatusIcon state={state} />
      <AppView className="flex-1">
        <AppText
          className={`text-[15px] font-bold ${highlighted ? 'text-brand-foreground' : 'text-foreground'}`}
        >
          {title}
          {optional ? (
            <AppText
              className={`text-[13px] font-medium ${highlighted ? 'text-brand-foreground' : 'text-muted'}`}
            >
              {' '}
              (optional)
            </AppText>
          ) : null}
        </AppText>
        {detail ? (
          <AppText
            numberOfLines={2}
            className={`mt-0.5 text-[12px] font-medium ${highlighted ? 'text-brand-foreground/90' : detailColor}`}
          >
            {detail}
          </AppText>
        ) : null}
      </AppView>
      {state === 'todo' || state === 'rejected' || highlighted ? (
        <Icon
          name="chevron.right"
          size={16}
          tone={highlighted ? 'brand-foreground' : 'icon-subtle'}
        />
      ) : null}
    </AppPressable>
  );
}
