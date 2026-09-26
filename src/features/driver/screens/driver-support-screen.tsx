import { useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';

interface HelpTopic {
  title: string;
  desc: string;
  icon: any;
}

const TOPICS: HelpTopic[] = [
  {
    title: 'Trip & Route Issues',
    desc: 'Wrong pickup/drop location, customer unavailable, cancelled trip',
    icon: 'box.truck.fill',
  },
  {
    title: 'Earnings & Payouts',
    desc: 'Fare discrepancies, delayed bank transfer, daily bonus claims',
    icon: 'banknote',
  },
  {
    title: 'Vehicle & Documents',
    desc: 'Update vehicle RC, renew insurance, driving license verification',
    icon: 'document',
  },
  {
    title: 'App & GPS Issues',
    desc: 'Location tracking issues, app crashes, account settings',
    icon: 'crosshair',
  },
  {
    title: 'Safety & Emergency',
    desc: 'Accident support, roadside breakdown, medical emergency assistance',
    icon: 'checkmark.shield.fill',
  },
  {
    title: 'Bonus & Tier Perks',
    desc: 'Weekly milestone rewards, surge pricing explanations',
    icon: 'gift.fill',
  },
];

export function DriverSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCall = () => {
    Linking.openURL('tel:18001234567');
  };

  const handleChat = () => {
    Alert.alert('Driver Care Chat', 'Connecting you to an agent... Estimated wait: 1 minute.', [
      { text: 'OK' },
    ]);
  };

  const handleTopicPress = (topic: HelpTopic) => {
    Alert.alert(
      topic.title,
      `Support article & quick resolutions for ${topic.title.toLowerCase()} are available. Would you like to call support or chat?`,
      [
        { text: 'Chat Now', onPress: handleChat },
        { text: 'Call Support', onPress: handleCall },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-card px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="items-center gap-3">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppView>
            <AppText className="text-[20px] font-black text-foreground">Help & Support</AppText>
            <AppText className="text-[12px] text-muted">24/7 dedicated partner assistance</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-16 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Support Desk Status Card */}
        <AppView className="rounded-3xl border border-brand/20 bg-card p-5 shadow-sm">
          <AppView row className="items-center justify-between">
            <AppView row className="items-center gap-3">
              <AppView className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                <Icon name="phone.fill" size={22} tone="brand" />
              </AppView>
              <AppView>
                <AppText className="text-[16px] font-extrabold text-foreground">
                  Partner Care Team
                </AppText>
                <AppView row className="items-center gap-1.5 mt-0.5">
                  <AppView className="h-2 w-2 rounded-full bg-emerald-500" />
                  <AppText className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Online • ~2 min response time
                  </AppText>
                </AppView>
              </AppView>
            </AppView>
          </AppView>

          <AppView row className="mt-4 gap-3">
            <AppPressable
              onPress={handleCall}
              pressScale={0.96}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand py-3 shadow-md active:bg-brand/90"
            >
              <Icon name="phone.fill" size={16} color="#ffffff" />
              <AppText className="text-[14px] font-bold text-white">Call Care</AppText>
            </AppPressable>

            <AppPressable
              onPress={handleChat}
              pressScale={0.96}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface-muted py-3 active:bg-neutral-200 dark:active:bg-neutral-800"
            >
              <Icon name="message.fill" size={16} tone="brand" />
              <AppText className="text-[14px] font-bold text-foreground">Live Chat</AppText>
            </AppPressable>
          </AppView>
        </AppView>

        {/* Topics List */}
        <AppView className="gap-2.5">
          <AppText className="text-[15px] font-extrabold text-foreground px-1">
            Browse by Topic
          </AppText>

          {TOPICS.map((topic) => (
            <AppPressable
              key={topic.title}
              onPress={() => handleTopicPress(topic)}
              pressScale={0.98}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
            >
              <AppView row className="flex-1 items-center gap-3.5">
                <AppView className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                  <Icon name={topic.icon} size={18} tone="brand" />
                </AppView>
                <AppView className="flex-1 pr-2">
                  <AppText className="text-[14px] font-bold text-foreground">{topic.title}</AppText>
                  <AppText className="text-[12px] text-muted" numberOfLines={1}>
                    {topic.desc}
                  </AppText>
                </AppView>
              </AppView>

              <Icon name="chevron.right" size={16} tone="icon-subtle" />
            </AppPressable>
          ))}
        </AppView>

        {/* Emergency SOS Banner */}
        <AppPressable
          onPress={() =>
            Alert.alert(
              'Emergency SOS',
              'Do you need immediate roadside or safety assistance? This will connect you to our emergency safety desk and share your live GPS location.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call Emergency Support', style: 'destructive', onPress: handleCall },
              ],
            )
          }
          className="flex-row items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
        >
          <AppView className="h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
            <Icon name="checkmark.shield.fill" size={20} color="#ef4444" />
          </AppView>
          <AppView className="flex-1">
            <AppText className="text-[14px] font-bold text-red-600 dark:text-red-400">
              Emergency & Safety Assistance
            </AppText>
            <AppText className="text-[12px] text-red-600/80 dark:text-red-400/80">
              Tap for immediate SOS protocol during an active trip
            </AppText>
          </AppView>
        </AppPressable>
      </AppScrollView>
    </AppView>
  );
}
