import { AppText, AppView } from '@/components/ui';
import type { CollectionBreakdown } from '@/lib/api/models';
import { formatRupees } from '@/lib/format';

function BreakdownRow({ label, amount }: { label: string; amount: number }) {
  return (
    <AppView row className="items-center justify-between">
      <AppText className="text-[13px] text-muted">{label}</AppText>
      <AppText className="text-[13px] font-semibold text-foreground-secondary">
        {amount < 0 ? `-${formatRupees(Math.abs(amount))}` : formatRupees(amount)}
      </AppText>
    </AppView>
  );
}

/** What the amount to collect is made of. Zero lines other than fare and tax are left out. */
export function CollectionBreakdownCard({ breakdown }: { breakdown: CollectionBreakdown }) {
  return (
    <AppView className="gap-2 rounded-2xl border border-border/80 bg-card px-4 py-3.5">
      <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
        Amount breakdown
      </AppText>
      <BreakdownRow label="Fare" amount={breakdown.fare} />
      {breakdown.waitingCharge !== 0 ? (
        <BreakdownRow label="Waiting charge" amount={breakdown.waitingCharge} />
      ) : null}
      {breakdown.otherCharges !== 0 ? (
        <BreakdownRow label="Other charges" amount={breakdown.otherCharges} />
      ) : null}
      {breakdown.discount !== 0 ? (
        <BreakdownRow label="Discount" amount={breakdown.discount} />
      ) : null}
      <BreakdownRow label="Tax" amount={breakdown.tax} />
    </AppView>
  );
}
