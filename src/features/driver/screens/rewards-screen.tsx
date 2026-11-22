import { Linking } from 'react-native';

import {
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
} from '@/components/ui';
import { useRewards } from '@/hooks/use-earnings';

import { SetupScreenLayout } from '../components/setup-screen-layout';

export function RewardsScreen() {
  const query = useRewards();
  const data = query.data;

  return (
    <SetupScreenLayout title="Rewards" subtitle="Insurance and discounts for partners">
      <AppScrollView
        contentContainerClassName="gap-4 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {query.isLoading ? <AppSpinner /> : null}
        {query.isError ? (
          <AppView className="items-center gap-3">
            <AppText className="text-center text-muted">Could not load rewards.</AppText>
            <Button
              label="Try again"
              variant="outline"
              size="sm"
              onPress={() => void query.refetch()}
            />
          </AppView>
        ) : null}
        {data && (!data.available || data.data.length === 0) ? (
          <AppView className="items-center rounded-3xl border border-dashed border-border bg-card p-8">
            <AppView className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
              <Icon name="gift.fill" size={30} tone="brand" />
            </AppView>
            <AppText className="mt-4 text-center text-[16px] font-extrabold text-foreground">
              No rewards available for now
            </AppText>
            <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
              Insurance, health cover and discounts for partners will show up here.
            </AppText>
          </AppView>
        ) : null}
        {data?.available
          ? data.data.map((reward) => (
              <AppView
                key={reward.id}
                className="gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <AppText className="text-[17px] font-extrabold text-foreground">
                  {reward.title}
                </AppText>
                {reward.subtitle ? (
                  <AppText className="text-[13px] font-semibold text-foreground-secondary">
                    {reward.subtitle}
                  </AppText>
                ) : null}
                {reward.description ? (
                  <AppText className="text-[13px] leading-5 text-muted">
                    {reward.description}
                  </AppText>
                ) : null}
                {reward.linkUrl ? (
                  <AppPressable
                    onPress={() => reward.linkUrl && Linking.openURL(reward.linkUrl)}
                    accessibilityRole="link"
                    className="mt-1 self-start rounded-full bg-brand/10 px-4 py-2"
                  >
                    <AppText className="text-[13px] font-bold text-brand">Know more</AppText>
                  </AppPressable>
                ) : null}
              </AppView>
            ))
          : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
