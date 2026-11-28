import { useState } from 'react';

import { AppPressable, AppScrollView, AppSpinner, AppText, AppView, Button } from '@/components/ui';
import { useRateCard } from '@/hooks/use-earnings';
import type { RateCard } from '@/lib/api/rate-card';
import { formatRupees } from '@/lib/format';

import { SetupScreenLayout } from '../components/setup-screen-layout';

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <AppView className="overflow-hidden rounded-2xl border border-border bg-card">
      <AppView className={`px-4 py-2.5 ${tone}`}>
        <AppText className="text-[13px] font-bold text-foreground">{title}</AppText>
      </AppView>
      {children}
    </AppView>
  );
}

function Row({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <AppView row className="items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
      <AppView className="flex-1">
        <AppText className="text-[14px] font-semibold text-foreground">{label}</AppText>
        {note ? <AppText className="text-[12px] text-muted">{note}</AppText> : null}
      </AppView>
      <AppText className="text-[14px] font-extrabold text-foreground">{value}</AppText>
    </AppView>
  );
}

function CardBody({ card }: { card: RateCard }) {
  return (
    <AppView className="gap-4">
      <Section title="Trip fare" tone="bg-emerald-500/10">
        {card.distanceSlabs.map((slab) => (
          <Row
            key={slab.fromKm}
            label="Distance fare"
            note={
              slab.toKm == null
                ? `${slab.fromKm} km and above`
                : `${slab.fromKm} to ${slab.toKm} km`
            }
            value={`${formatRupees(slab.perKm)} per km`}
          />
        ))}
        {card.perMinute > 0 ? (
          <Row
            label="Time fare"
            note="Time to complete the trip"
            value={`${formatRupees(card.perMinute)} per min`}
          />
        ) : null}
        <Row label="Base fare" note="For completing a trip" value={formatRupees(card.baseFare)} />
        {card.waiting ? (
          <Row
            label="Waiting charge"
            note={`After ${card.waiting.freeMinutes} min${card.waiting.maxCharge != null ? ` (max ${formatRupees(card.waiting.maxCharge)})` : ''}`}
            value={`${formatRupees(card.waiting.perMinute)} per min`}
          />
        ) : null}
      </Section>

      {card.cancelCompensationPerKm || card.night ? (
        <Section title="Extra fare (not on every trip)" tone="bg-emerald-500/10">
          {card.cancelCompensationPerKm ? (
            <Row
              label="Customer cancels"
              note="For each km you drove toward pickup"
              value={`${formatRupees(card.cancelCompensationPerKm)} per km`}
            />
          ) : null}
          {card.night ? (
            <Row
              label={`Night fare (${card.night.start} - ${card.night.end})`}
              note={`+${card.night.percent}% on base, time and distance fare`}
              value={`+${card.night.percent}%`}
            />
          ) : null}
        </Section>
      ) : null}

      {card.commissionPercent != null || card.gstPercent != null || card.handlingFee != null ? (
        <Section title="Commission and GST" tone="bg-amber-500/10">
          {card.commissionPercent != null ? (
            <Row
              label="Ryno commission"
              note="Taken from the trip fare"
              value={`${card.commissionPercent}%`}
            />
          ) : null}
          {card.gstPercent != null ? (
            <Row label="GST" note="Paid to the government" value={`${card.gstPercent}%`} />
          ) : null}
          {card.handlingFee != null ? (
            <Row label="Handling fee" value={formatRupees(card.handlingFee)} />
          ) : null}
        </Section>
      ) : null}
    </AppView>
  );
}

export function RateCardScreen() {
  const query = useRateCard();
  const data = query.data;
  const [selected, setSelected] = useState(0);
  const cards = data?.available ? data.cards : [];
  const card = cards[Math.min(selected, Math.max(cards.length - 1, 0))];

  return (
    <SetupScreenLayout title="Rate card" subtitle="How your trip fare is worked out">
      <AppScrollView
        contentContainerClassName="gap-4 px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {query.isLoading ? <AppSpinner /> : null}
        {query.isError ? (
          <AppView className="items-center gap-3">
            <AppText className="text-center text-muted">Could not load the rate card.</AppText>
            <Button
              label="Try again"
              variant="outline"
              size="sm"
              onPress={() => void query.refetch()}
            />
          </AppView>
        ) : null}
        {data && (!data.available || cards.length === 0) ? (
          <AppView className="items-center rounded-3xl border border-dashed border-border bg-card p-8">
            <AppText className="text-center text-[16px] font-extrabold text-foreground">
              Rate card is not available for now
            </AppText>
            <AppText className="mt-1 text-center text-[13px] leading-5 text-muted">
              Your per-km, base fare, waiting and commission rates will show up here.
            </AppText>
          </AppView>
        ) : null}
        {cards.length > 1 ? (
          <AppView row className="gap-2">
            {cards.map((c, index) => {
              const on = index === selected;
              return (
                <AppPressable
                  key={c.vehicleType}
                  onPress={() => setSelected(index)}
                  accessibilityState={{ selected: on }}
                  className={`rounded-full border px-4 py-2 ${on ? 'border-brand bg-brand/10' : 'border-border bg-surface-muted'}`}
                >
                  <AppText className={`text-[13px] font-bold ${on ? 'text-brand' : 'text-muted'}`}>
                    {c.vehicleType}
                  </AppText>
                </AppPressable>
              );
            })}
          </AppView>
        ) : null}
        {card ? <CardBody card={card} /> : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
