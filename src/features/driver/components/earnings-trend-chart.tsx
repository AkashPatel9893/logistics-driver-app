import { useState } from 'react';

import { AppPressable, AppText, AppView } from '@/components/ui';

interface ChartBarData {
  day: string;
  amount: number;
}

const WEEK_DATA: ChartBarData[] = [
  { day: 'Mon', amount: 820 },
  { day: 'Tue', amount: 960 },
  { day: 'Wed', amount: 1100 },
  { day: 'Thu', amount: 1420 },
  { day: 'Fri', amount: 1250 },
  { day: 'Sat', amount: 1680 },
  { day: 'Sun', amount: 1400 },
];

export function EarningsTrendChart({ className = '' }: { className?: string }) {
  const [selectedIdx, setSelectedIdx] = useState<number>(5); // Default Sat

  const maxAmount = Math.max(...WEEK_DATA.map((d) => d.amount));
  const selectedItem = WEEK_DATA[selectedIdx];

  return (
    <AppView className={`rounded-3xl border border-border bg-card p-4 shadow-sm ${className}`}>
      {/* Chart Title & Value */}
      <AppView row className="items-center justify-between pb-4">
        <AppView>
          <AppText className="text-[13px] font-semibold text-muted">Weekly Trend</AppText>
          <AppText className="mt-0.5 text-[20px] font-extrabold text-foreground">
            ₹{selectedItem.amount.toLocaleString('en-IN')}
          </AppText>
        </AppView>
        <AppView className="rounded-full bg-brand/10 px-3 py-1">
          <AppText className="text-[12px] font-bold text-brand">{selectedItem.day}</AppText>
        </AppView>
      </AppView>

      {/* Bars Container */}
      <AppView className="h-44 w-full flex-row items-end justify-between pt-6">
        {WEEK_DATA.map((item, idx) => {
          const isSelected = idx === selectedIdx;
          const barHeightPct = Math.max(15, Math.round((item.amount / maxAmount) * 100));

          return (
            <AppPressable
              key={item.day}
              onPress={() => setSelectedIdx(idx)}
              className="flex-1 items-center justify-end"
            >
              {isSelected ? (
                <AppView className="mb-1 rounded-md bg-neutral-900 px-1.5 py-0.5 dark:bg-white">
                  <AppText className="text-[9px] font-black text-white dark:text-black">
                    ₹{item.amount}
                  </AppText>
                </AppView>
              ) : null}

              {/* Bar Fill */}
              <AppView
                style={{ height: `${barHeightPct}%` }}
                className={`w-6 rounded-t-xl transition-all ${
                  isSelected ? 'bg-brand' : 'bg-surface-muted hover:bg-brand/40'
                }`}
              />

              {/* Day Label */}
              <AppText
                className={`mt-2 text-[12px] ${
                  isSelected ? 'font-black text-brand' : 'font-semibold text-muted'
                }`}
              >
                {item.day}
              </AppText>
            </AppPressable>
          );
        })}
      </AppView>
    </AppView>
  );
}
