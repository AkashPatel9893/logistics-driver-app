import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import type { DriverJob } from '@/lib/api/models';
import { formatRupees, placeName } from '@/lib/format';

import { JOB_STAGE_LABEL } from '../job-stage';

export interface ActiveDeliveryCardProps {
  job: DriverJob;
  className?: string;
}

export function ActiveDeliveryCard({ job, className = '' }: ActiveDeliveryCardProps) {
  const router = useRouter();

  return (
    <AppPressable
      onPress={() => router.push('/active-delivery')}
      pressScale={0.97}
      accessibilityLabel={`Current trip ${job.number}, ${JOB_STAGE_LABEL[job.status]}. Open trip`}
      className={`flex-row items-center justify-between rounded-full border border-border/80 bg-card p-3 shadow-lg active:bg-neutral-50 dark:active:bg-neutral-900 ${className}`}
    >
      <AppView className="h-12 w-12 items-center justify-center rounded-full bg-brand">
        <Icon name="box.truck.fill" size={20} color="#FFFFFF" />
      </AppView>

      <AppView className="flex-1 px-3.5">
        <AppText className="text-[15px] font-extrabold text-foreground" numberOfLines={1}>
          {placeName(job.pickup.label)} → {placeName(job.drop.label)}
        </AppText>
        <AppText className="mt-0.5 text-[12px] font-medium text-muted" numberOfLines={1}>
          {JOB_STAGE_LABEL[job.status]} · {formatRupees(job.driverEarning)}
        </AppText>
      </AppView>

      <AppView className="h-10 w-10 items-center justify-center rounded-full bg-brand">
        <Icon name="arrow.right" size={18} color="#FFFFFF" />
      </AppView>
    </AppPressable>
  );
}
