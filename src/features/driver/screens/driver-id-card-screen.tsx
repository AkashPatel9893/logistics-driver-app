import { Share } from 'react-native';

import { AppScrollView, AppSpinner, AppText, AppView, Avatar, Button, Icon } from '@/components/ui';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { useDriverProfile } from '@/hooks/use-driver';

import { SetupScreenLayout } from '../components/setup-screen-layout';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <AppView className="min-w-[45%] flex-1 gap-0.5">
      <AppText className="text-[11px] font-bold uppercase tracking-wider text-muted">
        {label}
      </AppText>
      <AppText className="text-[15px] font-bold text-foreground">{value}</AppText>
    </AppView>
  );
}

/** Month and year, or null when there is no usable date (the row is then left out). */
function memberSince(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** The driver's Ryno ID: who they are, what they drive and whether the admin has approved them. */
export function DriverIdCardScreen() {
  const { data: profile, isLoading, isError } = useDriverProfile();
  const user = useAuthStore.use.user();
  const approved = profile?.onboarding.status === 'approved';
  const partnerSince = memberSince(profile?.joinedAt ?? null);

  const share = () => {
    if (!profile) return;
    const vehicle = profile.vehicle
      ? ` Vehicle: ${profile.vehicle.vehicleTypeName} ${profile.vehicle.plateNumber}.`
      : '';
    void Share.share({
      message: `${profile.name} is a Ryno delivery partner${approved ? ' (verified by Ryno)' : ''}.${vehicle}`,
    });
  };

  return (
    <SetupScreenLayout title="Ryno ID card" subtitle="Your partner identity">
      <AppScrollView contentContainerClassName="gap-5 px-5 pb-16 pt-4">
        {isLoading ? <AppSpinner /> : null}
        {isError ? <AppText className="text-muted">Could not load your profile.</AppText> : null}
        {profile ? (
          <>
            <AppView className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <AppView className="h-24 bg-brand" />
              <AppView className="-mt-10 gap-4 px-5 pb-5">
                <AppView row className="items-end justify-between">
                  <Avatar name={profile.name} size="xl" className="border-4 border-card" />
                  <AppView
                    row
                    className={`items-center gap-1.5 rounded-full px-3 py-1.5 ${approved ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}
                  >
                    <Icon
                      name={approved ? 'checkmark.shield.fill' : 'info.circle'}
                      size={14}
                      color={approved ? '#059669' : '#b45309'}
                    />
                    <AppText
                      className={`text-[12px] font-bold ${approved ? 'text-emerald-700' : 'text-amber-700'}`}
                    >
                      {approved ? 'Approved' : 'Not yet approved'}
                    </AppText>
                  </AppView>
                </AppView>
                <AppText className="text-[22px] font-black text-foreground">{profile.name}</AppText>
                <AppView row className="flex-wrap gap-4">
                  <Field label="Mobile" value={user?.phone || profile.phone || '—'} />
                  <Field label="City" value={profile.city ?? '—'} />
                  <Field
                    label="Vehicle"
                    value={
                      profile.vehicle
                        ? `${profile.vehicle.vehicleTypeName} · ${profile.vehicle.plateNumber}`
                        : '—'
                    }
                  />
                  <Field label="Licence" value={profile.kyc?.dlNumber || '—'} />
                  <Field
                    label="Rating"
                    value={
                      profile.rating != null
                        ? `${profile.rating.toFixed(1)} (${profile.ratingCount})`
                        : 'No ratings yet'
                    }
                  />
                  <Field label="Trips" value={String(profile.lifetimeTrips)} />
                  {partnerSince ? <Field label="Partner since" value={partnerSince} /> : null}
                </AppView>
              </AppView>
            </AppView>
            <Button label="Share" variant="outline" onPress={share} />
          </>
        ) : null}
      </AppScrollView>
    </SetupScreenLayout>
  );
}
