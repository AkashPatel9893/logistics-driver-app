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

const LINE_LABEL: Record<string, string> = {
  NIGHT_CHARGE: 'Night charge',
  SURGE: 'Surge',
  TIP: 'Customer tip',
};

/**
 * What the amount to collect is made of. The backend's own lines come first, in order (so night
 * charge, surge and tip show up); without them, the fixed fields are used and zero ones left out.
 */
export function CollectionBreakdownCard({ breakdown }: { breakdown: CollectionBreakdown }) {
  const lines = breakdown.lines.filter((line) => line.amount !== 0);
  return (
    <AppView className="gap-2 rounded-2xl border border-border/80 bg-card px-4 py-3.5">
      <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
        Amount breakdown
      </AppText>
      {lines.length > 0 ? (
        <>
          {lines.map((line, index) => (
            <BreakdownRow
              key={`${line.type}-${index}`}
              label={LINE_LABEL[line.type] ?? (line.description || line.type)}
              amount={line.amount}
            />
          ))}
          <AppView className="mt-1 border-t border-border/60 pt-2">
            <BreakdownRow label="Total to collect" amount={breakdown.total} />
          </AppView>
        </>
      ) : (
        <FixedRows breakdown={breakdown} />
      )}
    </AppView>
  );
}

function FixedRows({ breakdown }: { breakdown: CollectionBreakdown }) {
  return (
    <>
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
      {breakdown.tip !== 0 ? <BreakdownRow label="Customer tip" amount={breakdown.tip} /> : null}
      <BreakdownRow label="Tax" amount={breakdown.tax} />
    </>
  );
}
