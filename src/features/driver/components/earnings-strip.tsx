import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import { useTrips } from '@/hooks/use-earnings';
import { formatRupees } from '@/lib/format';

export interface EarningsStripProps {
  earningsToday?: number;
  tripsToday?: number;
  walletBalance?: number;
}

function Figure({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <AppPressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${label} ${value}`}
      className="flex-1 gap-0.5 rounded-2xl bg-card px-3 py-3"
    >
      <AppText numberOfLines={1} className="text-[11px] font-semibold text-muted">
        {label}
      </AppText>
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        className="text-[18px] font-black text-foreground"
      >
        {value}
      </AppText>
    </AppPressable>
  );
}

/** Today's earnings in one line; tap to open wallet balance and the last trip. */
export function EarningsStrip({ earningsToday, tripsToday, walletBalance }: EarningsStripProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The last trip needs the trip list, so it is only fetched once the strip is opened.
  const trips = useTrips({ enabled: open });
  const last = trips.data
    ?.slice()
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())[0];
  const money = (value?: number) => (value == null ? '—' : formatRupees(value));

  return (
    <AppView className="overflow-hidden rounded-2xl border border-border/80 bg-surface-muted">
      <AppPressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Today's earnings ${money(earningsToday)}`}
        className="flex-row items-center justify-between px-4 py-3.5"
      >
        <AppView>
          <AppText className="text-[15px] font-bold text-foreground">Today&apos;s earnings</AppText>
          {tripsToday != null ? (
            <AppText className="text-[12px] text-muted">
              {tripsToday} {tripsToday === 1 ? 'trip' : 'trips'} today
            </AppText>
          ) : null}
        </AppView>
        <AppView row className="items-center gap-2">
          <AppText className="text-[20px] font-black text-foreground">
            {money(earningsToday)}
          </AppText>
          <Icon name={open ? 'chevron.up' : 'chevron.down'} size={16} tone="icon-subtle" />
        </AppView>
      </AppPressable>

      {open ? (
        <AppView className="gap-3 px-3 pb-3">
          <AppView row className="gap-2">
            <Figure
              label="Wallet balance"
              value={money(walletBalance)}
              onPress={() => router.push('/wallet')}
            />
            <Figure
              label="Last trip"
              value={trips.isLoading ? '…' : last ? formatRupees(last.driverEarning) : '—'}
              onPress={() => router.push('/(tabs)/orders')}
            />
          </AppView>
          <AppPressable
            onPress={() => router.push('/earnings')}
            className="items-center py-1"
            accessibilityRole="link"
          >
            <AppText className="text-[13px] font-bold text-brand">View earnings</AppText>
          </AppPressable>
        </AppView>
      ) : null}
    </AppView>
  );
}
