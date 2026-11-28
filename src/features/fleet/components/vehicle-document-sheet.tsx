import { useState } from 'react';
import { Modal } from 'react-native';

import { AppPressable, AppScrollView, AppText, AppView, Button, TextField } from '@/components/ui';
import { PhotoUploadBox } from '@/features/driver/components/photo-upload-box';
import { useLocalPhoto } from '@/features/driver/hooks/use-local-photo';
import { formatDateInput, toIsoDate } from '@/lib/api/onboarding';

export type VehicleDocumentType =
  'RC' | 'INSURANCE' | 'PUC' | 'FITNESS' | 'STATE_PERMIT' | 'NATIONAL_PERMIT';

export interface VehicleDocumentSubmission {
  type: VehicleDocumentType;
  photoUri: string;
  /** ISO date; undefined for the RC, which does not expire. */
  expiryDate?: string;
}

export interface VehicleDocumentSheetProps {
  visible: boolean;
  type: VehicleDocumentType;
  title: string;
  submitting?: boolean;
  /** Line under the title; defaults to the fleet owner's wording. */
  note?: string;
  /** Kinds to pick from (a permit is state or national); `type` is the first choice. */
  choices?: { type: VehicleDocumentType; label: string }[];
  onSubmit: (submission: VehicleDocumentSubmission) => void;
  onClose: () => void;
}

/** One vehicle document: a photo and, for insurance and pollution, its expiry date. */
export function VehicleDocumentSheet({
  visible,
  type,
  title,
  submitting = false,
  note = 'An admin checks it, usually within a day. You can assign a driver once it is verified.',
  choices,
  onSubmit,
  onClose,
}: VehicleDocumentSheetProps) {
  const photo = useLocalPhoto();
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState<string>();
  const [picked, setPicked] = useState<VehicleDocumentType | null>(null);
  const chosen = picked ?? type;
  const needsExpiry = chosen !== 'RC';

  const handleSubmit = () => {
    if (!photo.uri) return setError('Take a clear photo of the document.');
    const expiryDate = needsExpiry ? toIsoDate(expiry) : null;
    if (needsExpiry && !expiryDate) return setError('Enter the expiry date as DD/MM/YYYY.');
    setError(undefined);
    onSubmit({ type: chosen, photoUri: photo.uri, expiryDate: expiryDate ?? undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AppView className="flex-1 justify-end bg-black/40">
        <AppView className="max-h-[85%] rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <AppText className="text-[18px] font-extrabold text-foreground">{title}</AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">{note}</AppText>
          {choices && choices.length > 1 ? (
            <AppView row className="mb-4 gap-2">
              {choices.map((choice) => {
                const active = choice.type === chosen;
                return (
                  <AppPressable
                    key={choice.type}
                    onPress={() => setPicked(choice.type)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    className={`flex-1 items-center rounded-2xl border px-3 py-2.5 ${
                      active ? 'border-[#FF5722] bg-[#FF5722]/10' : 'border-border bg-surface'
                    }`}
                  >
                    <AppText
                      className={`text-[14px] font-bold ${active ? 'text-[#FF5722]' : 'text-foreground'}`}
                    >
                      {choice.label}
                    </AppText>
                  </AppPressable>
                );
              })}
            </AppView>
          ) : null}

          {/* Sized to its content: the sheet has no fixed height, so flex-1 would collapse it. */}
          <AppScrollView
            className="flex-initial"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppView className="gap-4">
              <PhotoUploadBox
                title="Add photo"
                photoUri={photo.uri}
                onSelectPhoto={photo.pick}
                uploading={submitting}
              />
              {needsExpiry ? (
                <TextField
                  variant="outlined"
                  label="Expiry date"
                  placeholder="DD/MM/YYYY"
                  value={expiry}
                  onChangeText={(value) => setExpiry(formatDateInput(value))}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              ) : null}
              {error ? (
                <AppText className="text-[13px] font-medium text-error">{error}</AppText>
              ) : null}
            </AppView>
          </AppScrollView>

          <Button
            variant="brand"
            label={submitting ? 'Sending…' : 'Send for verification'}
            className="mt-4"
            size="lg"
            disabled={submitting}
            loading={submitting}
            onPress={handleSubmit}
          />
          <Button
            variant="outline"
            label="Cancel"
            className="mt-2"
            disabled={submitting}
            onPress={onClose}
          />
        </AppView>
      </AppView>
    </Modal>
  );
}
