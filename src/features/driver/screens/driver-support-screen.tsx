import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { AppPressable, AppScrollView, AppSpinner, AppText, AppView, Icon } from '@/components/ui';
import { useSupportInfo } from '@/hooks/use-content';
import { useSos } from '@/hooks/use-support';
import { ApiError, getErrorMessage, toApiError } from '@/lib/api/api-error';

import { SetupScreenLayout } from '../components/setup-screen-layout';

/** India's national emergency number. */
const EMERGENCY_NUMBER = '112';

export function DriverSupportScreen() {
  const { data: support, isLoading } = useSupportInfo();
  const router = useRouter();
  const sos = useSos();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const callEmergency = () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`);

  // The safety team only hears about trips in progress; 112 is always offered as well.
  const sendSos = () =>
    sos.mutate(undefined, {
      onSuccess: (incident) =>
        Alert.alert(
          'Safety team alerted',
          `Reference ${incident.number}. They can see your location. If you are in danger, call ${EMERGENCY_NUMBER} now.`,
          [
            { text: 'OK', style: 'cancel' },
            { text: `Call ${EMERGENCY_NUMBER}`, onPress: callEmergency },
          ],
        ),
      onError: (error) => {
        const apiError: ApiError = toApiError(error);
        const message =
          apiError.code === 'NO_ACTIVE_TRIP'
            ? `The safety team can be alerted during a trip. For an emergency now, call ${EMERGENCY_NUMBER}.`
            : getErrorMessage(error);
        Alert.alert('Could not alert the safety team', message, [
          { text: 'Close', style: 'cancel' },
          { text: `Call ${EMERGENCY_NUMBER}`, style: 'destructive', onPress: callEmergency },
        ]);
      },
    });

  return (
    <SetupScreenLayout title="Help & support" subtitle="Partner care and common questions">
      <AppScrollView
        contentContainerClassName="gap-5 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="rounded-3xl border border-brand/20 bg-card p-5 shadow-sm">
          <AppText className="text-[16px] font-extrabold text-foreground">Partner care</AppText>
          <AppText className="mt-0.5 text-[12px] text-muted">
            {support ? `${support.phone} · ${support.email}` : 'Loading contact details…'}
          </AppText>
          <AppView row className="mt-4 gap-3">
            <AppPressable
              onPress={() => support && Linking.openURL(`tel:${support.phone}`)}
              disabled={!support}
              pressScale={0.96}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand py-3 shadow-md active:bg-brand/90"
            >
              <Icon name="phone.fill" size={16} color="#ffffff" />
              <AppText className="text-[14px] font-bold text-white">Call</AppText>
            </AppPressable>
            <AppPressable
              onPress={() => support && Linking.openURL(`mailto:${support.email}`)}
              disabled={!support}
              pressScale={0.96}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface-muted py-3"
            >
              <Icon name="envelope.fill" size={16} tone="brand" />
              <AppText className="text-[14px] font-bold text-foreground">Email</AppText>
            </AppPressable>
          </AppView>
        </AppView>

        <AppPressable
          onPress={() => router.push('/support-tickets')}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <Icon name="message.fill" size={18} tone="brand" />
          <AppView className="flex-1">
            <AppText className="text-[14px] font-bold text-foreground">My requests</AppText>
            <AppText className="text-[12px] text-muted">
              Message partner care and track replies
            </AppText>
          </AppView>
          <Icon name="chevron.right" size={16} tone="icon-subtle" />
        </AppPressable>

        <AppView className="gap-2.5">
          {support?.faqs.length ? (
            <AppText className="px-1 text-[15px] font-extrabold text-foreground">
              Frequently asked
            </AppText>
          ) : null}
          {isLoading ? <AppSpinner /> : null}
          {support?.faqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <AppPressable
                key={faq.id}
                onPress={() => setOpenFaq(isOpen ? null : faq.id)}
                accessibilityState={{ expanded: isOpen }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <AppView row className="items-center justify-between gap-3">
                  <AppText className="flex-1 text-[14px] font-bold text-foreground">
                    {faq.question}
                  </AppText>
                  <Icon
                    name={isOpen ? 'chevron.up' : 'chevron.down'}
                    size={16}
                    tone="icon-subtle"
                  />
                </AppView>
                {isOpen ? (
                  <AppText className="mt-2 text-[13px] leading-5 text-muted">{faq.answer}</AppText>
                ) : null}
              </AppPressable>
            );
          })}
        </AppView>

        <AppPressable
          onPress={() =>
            Alert.alert('Emergency SOS', 'Alert the Ryno safety team about your current trip?', [
              { text: 'Cancel', style: 'cancel' },
              { text: `Call ${EMERGENCY_NUMBER}`, onPress: callEmergency },
              { text: 'Alert safety team', style: 'destructive', onPress: sendSos },
            ])
          }
          disabled={sos.isPending}
          className="flex-row items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
        >
          <AppView className="h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
            <Icon name="exclamationmark.triangle.fill" size={20} color="#ef4444" />
          </AppView>
          <AppView className="flex-1">
            <AppText className="text-[14px] font-bold text-red-600 dark:text-red-400">
              Emergency SOS
            </AppText>
            <AppText className="text-[12px] text-red-600/80 dark:text-red-400/80">
              {sos.isPending
                ? 'Alerting the safety team…'
                : `Accident or safety issue — alerts our team or calls ${EMERGENCY_NUMBER}`}
            </AppText>
          </AppView>
        </AppPressable>
      </AppScrollView>
    </SetupScreenLayout>
  );
}
