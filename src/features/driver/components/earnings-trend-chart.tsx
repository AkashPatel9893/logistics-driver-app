import { useState } from 'react';

import { AppPressable, AppText, AppView } from '@/components/ui';
import { formatRupees } from '@/lib/format';

export interface EarningsTrendChartProps {
  title: string;
  buckets: { label: string; amount: number }[];
  className?: string;
}

export function EarningsTrendChart({ title, buckets, className = '' }: EarningsTrendChartProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const activeIdx = selectedIdx ?? buckets.length - 1;
  const selected = buckets[activeIdx];
  const maxAmount = Math.max(1, ...buckets.map((b) => b.amount));

  if (!selected) return null;

  return (
    <AppView className={`rounded-3xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <AppView row className="items-center justify-between pb-4">
        <AppView>
          <AppText className="text-[13px] font-semibold text-muted">{title}</AppText>
          <AppText className="mt-0.5 text-[20px] font-extrabold text-foreground">
            {formatRupees(selected.amount)}
          </AppText>
        </AppView>
        <AppView className="rounded-full bg-brand/10 px-3 py-1">
          <AppText className="text-[12px] font-bold text-brand">{selected.label}</AppText>
        </AppView>
      </AppView>

      <AppView className="h-44 w-full flex-row items-end justify-between pt-6">
        {buckets.map((bucket, idx) => {
          const isSelected = idx === activeIdx;
          const heightPct = bucket.amount > 0 ? Math.max(8, (bucket.amount / maxAmount) * 100) : 3;
          return (
            <AppPressable
              key={`${bucket.label}-${idx}`}
              onPress={() => setSelectedIdx(idx)}
              accessibilityLabel={`${bucket.label}: ${formatRupees(bucket.amount)}`}
              className="h-full flex-1 items-center justify-end"
            >
              <AppView
                style={{ height: `${heightPct}%` }}
                className={`w-6 rounded-t-xl ${isSelected ? 'bg-brand' : 'bg-surface-muted'}`}
              />
              <AppText
                className={`mt-2 text-[11px] ${
                  isSelected ? 'font-black text-brand' : 'font-semibold text-muted'
                }`}
              >
                {bucket.label}
              </AppText>
            </AppPressable>
          );
        })}
      </AppView>
    </AppView>
  );
}
