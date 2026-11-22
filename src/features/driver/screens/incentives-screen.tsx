import { useState } from 'react';

import {
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  Icon,
  SegmentedControl,
} from '@/components/ui';
import { useEarnings, useIncentives } from '@/hooks/use-earnings';
import type { Incentive, IncentiveType } from '@/lib/api/incentives';
import { formatMinutes, formatRupees, formatShortDate } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

const TABS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BONUS', label: 'Bonus' },
] as const satisfies readonly { value: IncentiveType; label: string }[];

const STATUS_LABEL: Record<Incentive['status'], string> = {
  ACTIVE: 'In progress',
  ACHIEVED: 'Achieved',
  EXPIRED: 'Ended',
  UPCOMING: 'Starts soon',
};

const CLAIM_LABEL: Record<string, string> = {
  PENDING: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Not paid',
  CREDITED: 'Paid to wallet',
};

function formatProgress({ current, target, unit }: Incentive['progress']): string {
  if (unit === 'EARNINGS') return `${formatRupees(current)} of ${formatRupees(target)}`;
  if (unit === 'ONLINE_MINUTES') return `${formatMinutes(current)} of ${formatMinutes(target)}`;
  return `${current} of ${target} ${target === 1 ? 'trip' : 'trips'}`;
}

function IncentiveCard({ incentive }: { incentive: Incentive }) {
  const { current, target } = incentive.progress;
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const achieved = incentive.status === 'ACHIEVED';
  return (
    <AppView className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <AppView row className="items-start justify-between gap-3">
        <AppView className="flex-1">
          <AppText className="text-[15px] font-extrabold text-foreground">
            {incentive.title}
          </AppText>
          <AppText className="mt-0.5 text-[12px] text-muted">
            {formatShortDate(incentive.startsAt)} – {formatShortDate(incentive.endsAt)}
          </AppText>
        </AppView>
        <AppView className="items-end">
          <AppText className="text-[18px] font-black text-brand">
            {formatRupees(incentive.rewardAmount)}
          </AppText>
          <AppView
            className={`rounded-full px-2 py-0.5 ${achieved ? 'bg-emerald-500/15' : 'bg-surface-muted'}`}
          >
            <AppText
              className={`text-[10px] font-bold ${achieved ? 'text-emerald-700' : 'text-muted'}`}
            >
              {STATUS_LABEL[incentive.status]}
            </AppText>
          </AppView>
        </AppView>
      </AppView>
      {incentive.description ? (
        <AppText className="text-[13px] leading-5 text-muted">{incentive.description}</AppText>
      ) : null}
      {target > 0 ? (
        <AppView className="gap-1.5">
          <AppView className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <AppView
              className={`h-2 rounded-full ${achieved ? 'bg-emerald-500' : 'bg-brand'}`}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </AppView>
          <AppText className="text-[12px] font-semibold text-foreground-secondary">
            {formatProgress(incentive.progress)}
          </AppText>
        </AppView>
      ) : null}
      {incentive.conditions.length > 0 ? (
        <AppView className="gap-1 border-t border-border/60 pt-3">
          {incentive.conditions.map((condition) => (
            <AppText key={condition} className="text-[12px] text-muted">
              • {condition}
            </AppText>
          ))}
        </AppView>
      ) : null}
    </AppView>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <AppView className="items-center rounded-3xl border border-dashed border-border bg-card p-8">
      <AppView className="h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
        <Icon name="gift.fill" size={30} tone="brand" />
      </AppView>
      <AppText className="mt-4 text-center text-[16px] font-extrabold text-foreground">
        {title}
      </AppText>
      <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">{body}</AppText>
    </AppView>
  );
}

export function IncentivesScreen() {
  const [type, setType] = useState<IncentiveType>('DAILY');
  const query = useIncentives(type);
  const earnings = useEarnings('month');
  const data = query.data;

  return (
    <SetupScreenLayout title="Incentives" subtitle="Daily, weekly and bonus rewards">
      <AppScrollView
        contentContainerClassName="gap-4 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <AppView className="rounded-3xl bg-neutral-950 p-5">
          <AppText className="text-[13px] font-semibold text-neutral-400">
            Incentives earned this month
          </AppText>
          <AppText className="mt-1 text-[30px] font-black text-white">
            {earnings.data ? formatRupees(earnings.data.incentives) : '—'}
          </AppText>
        </AppView>

        <SegmentedControl options={TABS} value={type} onChange={setType} />

        {query.isLoading ? <AppSpinner /> : null}
        {query.isError ? (
          <AppView className="items-center gap-3">
            <AppText className="text-center text-muted">Could not load incentives.</AppText>
            <Button
              label="Try again"
              variant="outline"
              size="sm"
              onPress={() => void query.refetch()}
            />
          </AppView>
        ) : null}
        {data && !data.available ? (
          <EmptyState
            title="Incentives are not available for now"
            body="Check again after some time. New offers will show up here."
          />
        ) : null}
        {data?.available && data.programmes.length === 0 ? (
          <EmptyState
            title={`No ${type.toLowerCase()} incentives right now`}
            body="When an offer is running for your city and vehicle, you will see your progress here."
          />
        ) : null}
        {data?.programmes.map((incentive) => (
          <IncentiveCard key={incentive.id} incentive={incentive} />
        ))}

        {data?.available && data.claims.length > 0 ? (
          <AppView className="gap-2.5">
            <AppText className="px-1 text-[15px] font-extrabold text-foreground">
              Incentive payouts
            </AppText>
            {data.claims.map((claim) => (
              <AppView
                key={claim.id}
                row
                className="items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <AppView className="flex-1">
                  <AppText className="text-[14px] font-bold text-foreground">{claim.title}</AppText>
                  <AppText className="text-[12px] text-muted">
                    {formatShortDate(claim.createdAt)} · {CLAIM_LABEL[claim.status] ?? claim.status}
                  </AppText>
                </AppView>
                <AppText className="text-[15px] font-black text-foreground">
                  {formatRupees(claim.amount)}
                </AppText>
              </AppView>
            ))}
          </AppView>
        ) : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
