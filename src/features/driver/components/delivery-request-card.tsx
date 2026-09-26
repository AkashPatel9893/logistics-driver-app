import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import { useCountdown } from '@/hooks/use-countdown';
import type { JobOffer } from '@/lib/api/models';
import { formatDistance, formatMinutes, formatRupees, placeName } from '@/lib/format';

export interface DeliveryRequestCardProps {
  offer: JobOffer;
  onOpen: (offer: JobOffer) => void;
  className?: string;
}

/** Compact offer card on the home screen; tapping opens the full request. */
export function DeliveryRequestCard({ offer, onOpen, className = '' }: DeliveryRequestCardProps) {
  const secondsLeft = useCountdown(offer.expiresAt);

  return (
    <AppPressable
      onPress={() => onOpen(offer)}
      pressScale={0.98}
      accessibilityLabel={`New ${offer.vehicle.name} request, ${formatRupees(offer.driverEarning)}. Opens details`}
      className={`overflow-hidden rounded-[26px] border border-brand/40 bg-card p-4.5 shadow-sm ${className}`}
    >
      <AppView row className="items-center justify-between border-b border-border/40 pb-3">
        <AppView>
          <AppText className="text-[16px] font-extrabold text-foreground">
            {offer.vehicle.name} · Delivery
          </AppText>
          <AppText className="text-[12px] font-medium text-muted">
            Expires in {secondsLeft}s · #{offer.orderNumber}
          </AppText>
        </AppView>
        <AppView className="items-end">
          <AppText className="text-[22px] font-black text-foreground">
            {formatRupees(offer.driverEarning)}
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
