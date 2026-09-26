import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { AppScrollView, AppText, AppView, Button, Icon } from '@/components/ui';
import { useDriverProfile, useSubmitDailyCheck } from '@/hooks/use-driver';
import { getErrorMessage } from '@/lib/api/api-error';
import { formatRupees } from '@/lib/format';

import { PhotoUploadBox } from '../components/photo-upload-box';
import { SetupScreenLayout } from '../components/setup-screen-layout';
import { usePhotoUpload } from '../hooks/use-photo-upload';

const GUIDELINES = [
  'Stand in front of your vehicle with your face visible',
  'Number plate must be clear and readable',
  'Take the photo in daylight or good light',
  'Vehicle should be clean and ready for goods',
];

export function DailyCheckScreen() {
  const router = useRouter();
  const { data: profile } = useDriverProfile();
  const submit = useSubmitDailyCheck();
  const check = profile?.dailyCheck;
  // Camera-first: the check proves the vehicle is on the road today.
  const selfie = usePhotoUpload('daily_check', check?.photoUrl ?? null, 'camera');
  const done = check?.completedToday ?? false;
  const reward = formatRupees(check?.reward ?? 0);

  const handleSubmit = () => {
    if (!selfie.url) {
      Alert.alert('Photo required', 'Take a selfie with your vehicle to continue.');
      return;
    }
    submit.mutate(selfie.url, {
      onSuccess: () =>
        Alert.alert('Check complete', `${reward} has been added to your wallet.`, [
          { text: 'OK', onPress: () => router.back() },
        ]),
      onError: (e) => Alert.alert('Could not submit', getErrorMessage(e)),
    });
  };

  return (
    <SetupScreenLayout title="Daily vehicle check" subtitle="Safety check before your shift">
      <AppScrollView
        contentContainerClassName="gap-5 px-5 pb-12 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="overflow-hidden rounded-3xl border border-brand/30 bg-brand/10 p-5">
          <AppView row className="items-center justify-between">
            <AppView className="flex-1 pr-3">
              <AppText className="text-[12px] font-bold uppercase tracking-wider text-brand">
                DAILY INCENTIVE
              </AppText>
              <AppText className="mt-0.5 text-[22px] font-black text-foreground">
                {done ? `${reward} earned today` : `Earn ${reward} today`}
              </AppText>
            </AppView>
            <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand">
              <Icon name={done ? 'checkmark' : 'camera'} size={24} color="#ffffff" />
            </AppView>
          </AppView>
          <AppText className="mt-2 text-[13px] leading-5 text-muted">
            One selfie with your vehicle each day keeps customers safe and adds a bonus to your
            wallet.
          </AppText>
        </AppView>

        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppText className="text-[15px] font-bold text-foreground">Photo guidelines</AppText>
          <AppView className="mt-3 gap-2.5">
            {GUIDELINES.map((rule) => (
              <AppView key={rule} row className="items-start gap-2.5">
                <AppView className="mt-1.5 h-2 w-2 rounded-full bg-brand" />
                <AppText className="flex-1 text-[13px] text-foreground-secondary">{rule}</AppText>
              </AppView>
            ))}
          </AppView>
        </AppView>

        <PhotoUploadBox
          label="Your vehicle selfie"
          title="Take selfie"
          hint="Take it now with your phone camera"
          photoUri={selfie.previewUri}
          uploading={selfie.uploading}
          error={selfie.error}
          onSelectPhoto={done ? undefined : selfie.pick}
        />

        <Button
          label={done ? 'Completed for today' : `Submit & earn ${reward}`}
          onPress={handleSubmit}
          disabled={done || selfie.uploading}
          loading={submit.isPending}
          size="lg"
          textClassName="font-extrabold text-base"
        />
      </AppScrollView>
    </SetupScreenLayout>
  );
}
