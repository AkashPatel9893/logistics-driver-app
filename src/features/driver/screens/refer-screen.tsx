import { Share } from 'react-native';

import { AppScrollView, AppSpinner, AppText, AppView, Button, Icon } from '@/components/ui';
import { useReferral } from '@/hooks/use-earnings';
import { formatRupees, formatShortDate } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

const STATUS_LABEL: Record<string, string> = {
  SIGNED_UP: 'Signed up',
  ONBOARDED: 'Verified',
  REWARDED: 'Reward paid',
};

export function ReferScreen() {
  const query = useReferral();
  const data = query.data;
  const info = data?.available ? data.data : null;

  const share = () => {
    if (!info) return;
    const message =
      info.shareMessage || `Join me as a Ryno delivery partner. Use my code ${info.code}.`;
    void Share.share({ message });
  };

  return (
    <SetupScreenLayout title="Refer friends" subtitle="Earn when they start driving">
      <AppScrollView
        contentContainerClassName="gap-4 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {query.isLoading ? <AppSpinner /> : null}
        {query.isError ? (
          <AppView className="items-center gap-3">
            <AppText className="text-center text-muted">
              Could not load your referral details.
            </AppText>
            <Button
              label="Try again"
              variant="outline"
              size="sm"
              onPress={() => void query.refetch()}
            />
          </AppView>
        ) : null}
        {data && !data.available ? (
          <AppView className="items-center rounded-3xl border border-dashed border-border bg-card p-8">
            <AppView className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
              <Icon name="person.badge.plus" size={30} tone="brand" />
            </AppView>
            <AppText className="mt-4 text-center text-[16px] font-extrabold text-foreground">
              Referrals are not available for now
            </AppText>
            <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
              Your referral code and rewards will show up here.
            </AppText>
          </AppView>
        ) : null}
        {info ? (
          <>
            <AppView className="rounded-3xl bg-neutral-950 p-5">
              <AppText className="text-[13px] font-semibold text-neutral-400">
                Your referral earnings
              </AppText>
              <AppText className="mt-1 text-[30px] font-black text-white">
                {formatRupees(info.totalEarned)}
              </AppText>
            </AppView>

            {info.rewards.length > 0 ? (
              <AppView className="gap-2.5">
                <AppText className="px-1 text-[15px] font-extrabold text-foreground">
                  What you earn
                </AppText>
                {info.rewards.map((reward) => (
                  <AppView
                    key={reward.label}
                    row
                    className="items-center justify-between rounded-2xl border border-border bg-card p-4"
                  >
                    <AppText className="text-[14px] font-bold text-foreground">
                      {reward.label}
                    </AppText>
                    <AppText className="text-[15px] font-black text-brand">
                      {formatRupees(reward.amount)}
                    </AppText>
                  </AppView>
                ))}
              </AppView>
            ) : null}

            {info.referrals.length > 0 ? (
              <AppView className="gap-2.5">
                <AppText className="px-1 text-[15px] font-extrabold text-foreground">
                  Your referrals
                </AppText>
                {info.referrals.map((r, index) => (
                  <AppView
                    key={`${r.name}-${index}`}
                    row
                    className="items-center justify-between rounded-2xl border border-border bg-card p-4"
                  >
                    <AppView className="flex-1">
                      <AppText className="text-[14px] font-bold text-foreground">{r.name}</AppText>
                      <AppText className="text-[12px] text-muted">
                        {formatShortDate(r.createdAt)} · {STATUS_LABEL[r.status] ?? r.status}
                      </AppText>
                    </AppView>
                    <AppText className="text-[14px] font-black text-foreground">
                      {formatRupees(r.rewardAmount)}
                    </AppText>
                  </AppView>
                ))}
              </AppView>
            ) : null}

            <AppView className="gap-3 rounded-2xl border border-border bg-card p-4">
              <AppText className="text-[12px] font-bold uppercase tracking-wider text-muted">
                Your referral code
              </AppText>
              <AppText
                selectable
                className="text-[24px] font-black tracking-widest text-foreground"
              >
                {info.code}
              </AppText>
              <Button label="Refer friends" variant="brand" onPress={share} />
            </AppView>
          </>
        ) : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
