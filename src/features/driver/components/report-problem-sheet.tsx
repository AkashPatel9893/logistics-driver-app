import { useState } from 'react';
import { Modal } from 'react-native';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppText,
  AppView,
  Button,
  TextField,
} from '@/components/ui';
import { useReportIncident } from '@/hooks/use-support';
import { ApiError, getErrorMessage } from '@/lib/api/api-error';
import type { Incident, IncidentType } from '@/lib/api/safety';

const TYPES: { value: IncidentType; label: string }[] = [
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'RUDE_BEHAVIOUR', label: 'Rude behaviour' },
  { value: 'OTHER', label: 'Something else' },
];

const MIN_LENGTH = 10;

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'SAFETY_RATE_LIMITED') return 'Too many reports. Try again later.';
    if (error.code === 'ORDER_NOT_FOUND') return 'This trip could not be found.';
  }
  return getErrorMessage(error);
}

export interface ReportProblemSheetProps {
  orderId: string;
  onClose: () => void;
  onSent: (incident: Incident) => void;
}

/** Report something that happened on a trip. Mount it only while open, so it starts empty. */
export function ReportProblemSheet({ orderId, onClose, onSent }: ReportProblemSheetProps) {
  const report = useReportIncident();
  const [type, setType] = useState<IncidentType>();
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string>();

  const handleSend = () => {
    if (!type) return setError('Choose what happened.');
    const text = description.trim();
    if (text.length < MIN_LENGTH) return setError(`Write at least ${MIN_LENGTH} characters.`);
    setError(undefined);
    report.mutate(
      { orderId, type, description: text },
      { onSuccess: onSent, onError: (e) => setError(errorText(e)) },
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <AppKeyboardAvoidingView className="justify-end bg-black/40">
        <AppView className="rounded-t-3xl bg-background px-5 pb-8 pt-5">
          <AppText className="text-[18px] font-extrabold text-foreground">Report a problem</AppText>
          <AppText className="mb-4 mt-1 text-[13px] text-muted">
            Our safety team will look into it. In an emergency, call 112.
          </AppText>

          <AppView className="gap-4">
            <AppView row className="flex-wrap gap-2">
              {TYPES.map((option) => (
                <AppPressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: type === option.value }}
                  className={`rounded-xl border px-3 py-2 ${type === option.value ? 'border-brand bg-brand' : 'border-border bg-card'}`}
                >
                  <AppText
                    className={
                      type === option.value ? 'font-bold text-brand-foreground' : 'text-foreground'
                    }
                  >
                    {option.label}
                  </AppText>
                </AppPressable>
              ))}
            </AppView>
            <TextField
              variant="outlined"
              label="What happened?"
              placeholder="Tell us what happened"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={2000}
              inputClassName="min-h-24 text-top"
            />
            {error ? (
              <AppText className="text-[13px] font-medium text-error">{error}</AppText>
            ) : null}
          </AppView>

          <Button
            variant="brand"
            label={report.isPending ? 'Sending…' : 'Send report'}
            className="mt-4"
            size="lg"
            disabled={report.isPending}
            loading={report.isPending}
            onPress={handleSend}
          />
          <Button
            variant="outline"
            label="Cancel"
            className="mt-2"
            disabled={report.isPending}
            onPress={onClose}
          />
        </AppView>
      </AppKeyboardAvoidingView>
    </Modal>
  );
}
