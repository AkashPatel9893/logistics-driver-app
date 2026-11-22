import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import { useCountdown } from '@/hooks/use-countdown';
import type { JobOffer } from '@/lib/api/models';
import {
  formatDistance,
  formatEarning,
  formatMinutes,
  formatRupees,
  placeName,
} from '@/lib/format';

export interface DeliveryRequestCardProps {
  offer: JobOffer;
  onOpen: (offer: JobOffer) => void;
  className?: string;
}

/** Priority booking: the customer paid extra to be picked up first. */
export function PriorityBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <AppView
      row
      className={`items-center gap-1 rounded-full px-2.5 py-1 ${onDark ? 'bg-white' : 'bg-amber-500'}`}
    >
      <Icon name="bolt.fill" size={12} color={onDark ? '#d97706' : '#ffffff'} />
      <AppText
        className={`text-[11px] font-extrabold uppercase tracking-wide ${onDark ? 'text-amber-700' : 'text-white'}`}
      >
        Priority
      </AppText>
    </AppView>
  );
}

/** Tip the customer added: all of it goes to the driver. */
export function TipBadge({ amount, onDark = false }: { amount: number; onDark?: boolean }) {
  return (
    <AppView
      row
      className={`items-center gap-1 rounded-full px-2.5 py-1 ${onDark ? 'bg-white/20' : 'bg-emerald-500/15'}`}
    >
      <Icon name="gift.fill" size={12} color={onDark ? '#ffffff' : '#059669'} />
      <AppText
        className={`text-[11px] font-extrabold ${onDark ? 'text-white' : 'text-emerald-700 dark:text-emerald-400'}`}
      >
        +{formatRupees(amount)} tip
      </AppText>
    </AppView>
  );
}

/** Compact offer card on the home screen; tapping opens the full request. */
export function DeliveryRequestCard({ offer, onOpen, className = '' }: DeliveryRequestCardProps) {
  const secondsLeft = useCountdown(offer.expiresAt);

  return (
    <AppPressable
      onPress={() => onOpen(offer)}
      pressScale={0.98}
      accessibilityLabel={`New ${offer.isPriority ? 'priority ' : ''}${offer.vehicle.name} request, ${formatEarning(offer.driverEarning, offer.fare)}${offer.tipAmount > 0 ? `, plus ${formatRupees(offer.tipAmount)} tip` : ''}. Opens details`}
      className={`overflow-hidden rounded-[26px] border bg-card p-4.5 shadow-sm ${
        offer.isPriority ? 'border-2 border-amber-500' : 'border-brand/40'
      } ${className}`}
    >
      {offer.isPriority || offer.tipAmount > 0 ? (
        <AppView row className="mb-2.5 flex-wrap gap-2">
          {offer.isPriority ? <PriorityBadge /> : null}
          {offer.tipAmount > 0 ? <TipBadge amount={offer.tipAmount} /> : null}
        </AppView>
      ) : null}
      <AppView row className="items-center justify-between border-b border-border/40 pb-3">
        <AppView>
          <AppText className="text-[16px] font-extrabold text-foreground">
            {[offer.vehicle.name, 'Delivery'].filter(Boolean).join(' · ')}
          </AppText>
          <AppText className="text-[12px] font-medium text-muted">
            Expires in {secondsLeft}s · #{offer.orderNumber}
          </AppText>
        </AppView>
        <AppView className="items-end">
          <AppText className="text-[22px] font-black text-foreground">
            {formatEarning(offer.driverEarning, offer.fare)}
          </AppText>
          <AppText className="text-[11px] font-medium text-muted">your earning</AppText>
        </AppView>
      </AppView>

      <AppView className="my-3.5 gap-2.5">
        <AppView row className="items-center gap-3">
          <AppView className="h-3 w-3 rounded-full bg-emerald-500" />
          <AppText className="flex-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
            {offer.pickup.label}
          </AppText>
        </AppView>
        <AppView row className="items-center gap-3">
          <AppView className="h-3 w-3 rounded-full bg-brand" />
          <AppText className="flex-1 text-[14px] font-bold text-foreground" numberOfLines={1}>
            {offer.drop.label}
          </AppText>
        </AppView>
      </AppView>

      <AppView row className="items-center justify-between">
        <AppText className="text-[13px] font-medium text-muted">
          {offer.pickupDistanceKm !== null
            ? `${formatDistance(offer.pickupDistanceKm)} to pickup`
            : placeName(offer.pickup.label)}
        </AppText>
        <AppText className="text-[13px] font-medium text-muted">
          {formatDistance(offer.tripDistanceKm)} · {formatMinutes(offer.estimatedMinutes)}
        </AppText>
        <AppView row className="items-center gap-1">
          <AppText className="text-[13px] font-bold text-brand">View</AppText>
          <Icon name="chevron.right" size={14} tone="brand" />
        </AppView>
      </AppView>
    </AppPressable>
  );
}
