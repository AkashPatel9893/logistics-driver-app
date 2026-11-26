import { useState } from 'react';
import { Modal } from 'react-native';

import { AppScrollView, AppText, AppView, Button, TextField } from '@/components/ui';
import { PhotoUploadBox } from '@/features/driver/components/photo-upload-box';
import { useLocalPhoto } from '@/features/driver/hooks/use-local-photo';
import { formatDateInput, toIsoDate } from '@/lib/api/onboarding';

export type VehicleDocumentType = 'RC' | 'INSURANCE' | 'PUC';

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
  onSubmit: (submission: VehicleDocumentSubmission) => void;
  onClose: () => void;
}

/** One vehicle document: a photo and, for insurance and pollution, its expiry date. */
export function VehicleDocumentSheet({
  visible,
  type,
  title,
  submitting = false,
  onSubmit,
  onClose,
}: VehicleDocumentSheetProps) {
  const photo = useLocalPhoto();
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState<string>();
  const needsExpiry = type !== 'RC';

  const handleSubmit = () => {
    if (!photo.uri) return setError('Take a clear photo of the document.');
    const expiryDate = needsExpiry ? toIsoDate(expiry) : null;
    if (needsExpiry && !expiryDate) return setError('Enter the expiry date as DD/MM/YYYY.');
    setError(undefined);
    onSubmit({ type, photoUri: photo.uri, expiryDate: expiryDate ?? undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AppView className="flex-1 justify-end bg-black/40">
        <AppView className="max-h-[85%] rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <AppText className="text-[18px] font-extrabold text-foreground">{title}</AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">
            An admin checks it, usually within a day. You can assign a driver once it is verified.
          </AppText>

          <AppScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
