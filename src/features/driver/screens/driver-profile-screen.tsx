import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

export function DriverProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const name = useDriverStore((s) => s.name);
  const phone = useDriverStore((s) => s.phone);
  const rating = useDriverStore((s) => s.rating);
  const partnerSince = useDriverStore((s) => s.partnerSince);
  const city = useDriverStore((s) => s.city);
  const vehicle = useDriverStore((s) => s.vehicle);
  const kyc = useDriverStore((s) => s.kyc);

  const DOCUMENTS = [
    {
      name: 'Driving License (DL)',
      id: kyc.dlNumber || 'DL-042019003412',
      status: 'Verified',
      expires: 'Exp: 14 Oct 2028',
    },
    {
      name: 'Registration Certificate (RC)',
      id: vehicle.plateNumber,
      status: 'Verified',
      expires: 'Exp: 22 Jan 2030',
    },
    {
      name: 'Commercial Vehicle Insurance',
      id: 'POL-992384729',
      status: 'Verified',
      expires: 'Exp: 18 Dec 2026',
    },
    {
      name: 'Pollution Under Control (PUC)',
      id: 'PUC-8823190',
      status: 'Verified',
      expires: 'Exp: 04 Nov 2026',
    },
  ];

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-card px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="items-center gap-3">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppView>
            <AppText className="text-[20px] font-black text-foreground">Driver Profile</AppText>
            <AppText className="text-[12px] text-muted">
              Partner verification & vehicle records
            </AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppScrollView
        contentContainerClassName="px-5 pb-16 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Card */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center gap-4">
            <AppView className="h-16 w-16 items-center justify-center rounded-full bg-brand/10 border-2 border-brand/30">
              <AppText className="text-[24px] font-black text-brand">
                {name ? name.slice(0, 1).toUpperCase() : 'R'}
              </AppText>
            </AppView>

            <AppView className="flex-1">
              <AppText className="text-[18px] font-black text-foreground">
                {name || 'Rajesh Kumar'}
              </AppText>
              <AppText className="text-[13px] text-muted">{phone || '+91 98765 43210'}</AppText>
              <AppText className="text-[12px] text-foreground-secondary mt-0.5">
                📍 {city || 'Delhi NCR'} • {partnerSince}
              </AppText>
            </AppView>
          </AppView>

          <AppView row className="mt-4 items-center justify-between border-t border-border/80 pt-3">
            <AppView row className="items-center gap-1.5">
              <Icon name="star.fill" size={14} color="#f59e0b" />
              <AppText className="text-[13px] font-bold text-foreground">{rating} Rating</AppText>
            </AppView>
            <AppView className="rounded-full bg-emerald-500/15 px-3 py-0.5">
              <AppText className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                ACTIVE PARTNER
              </AppText>
            </AppView>
          </AppView>
        </AppView>

        {/* Assigned Vehicle Card */}
        <AppView className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <AppView row className="items-center justify-between border-b border-border/60 pb-3">
            <AppView row className="items-center gap-2.5">
              <Icon name="box.truck.fill" size={20} tone="brand" />
              <AppText className="text-[16px] font-extrabold text-foreground">
                Vehicle Details
              </AppText>
            </AppView>
            <AppPressable onPress={() => router.push('/setup-vehicle')}>
              <AppText className="text-[12px] font-bold text-brand">Update</AppText>
            </AppPressable>
          </AppView>

          <AppView className="mt-3 gap-2">
            <AppView row className="items-center justify-between">
              <AppText className="text-[13px] text-muted">Vehicle Model</AppText>
              <AppText className="text-[14px] font-bold text-foreground">{vehicle.model}</AppText>
            </AppView>

            <AppView row className="items-center justify-between">
              <AppText className="text-[13px] text-muted">Registration Number</AppText>
              <AppText className="text-[14px] font-black text-brand">{vehicle.plateNumber}</AppText>
            </AppView>

            <AppView row className="items-center justify-between">
              <AppText className="text-[13px] text-muted">Payload Capacity</AppText>
              <AppText className="text-[14px] font-bold text-foreground">
                {vehicle.capacity}
              </AppText>
            </AppView>
          </AppView>
        </AppView>

        {/* Document Verification Status */}
        <AppView className="gap-3">
          <AppText className="text-[16px] font-extrabold text-foreground px-1">
            Verified Documents
          </AppText>

          {DOCUMENTS.map((doc) => (
            <AppView
              key={doc.name}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <AppView row className="items-center justify-between">
                <AppView row className="items-center gap-2">
                  <Icon name="checkmark.shield.fill" size={18} color="#10b981" />
                  <AppText className="text-[14px] font-bold text-foreground">{doc.name}</AppText>
                </AppView>

                <AppView className="rounded-full bg-emerald-500/15 px-2.5 py-0.5">
                  <AppText className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                    {doc.status.toUpperCase()}
                  </AppText>
                </AppView>
              </AppView>

              <AppView row className="mt-2 items-center justify-between text-[12px]">
                <AppText className="text-[12px] text-muted font-medium">ID: {doc.id}</AppText>
                <AppText className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {doc.expires}
                </AppText>
              </AppView>
            </AppView>
          ))}
        </AppView>
      </AppScrollView>
    </AppView>
  );
}
