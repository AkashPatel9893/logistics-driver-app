import { useRouter } from 'expo-router';

import { AppPressable, AppText, AppView, Icon } from '@/components/ui';
import { useFleetLinkRequests } from '@/hooks/use-fleet';

/** On the owner's Home while a driver is waiting for an answer. */
export function JoinRequestsBanner() {
  const router = useRouter();
  const { data: requests = [] } = useFleetLinkRequests();
  const [first] = requests;
  if (!first) return null;

  return (
    <AppPressable
      onPress={() => router.push('/fleet-drivers')}
      pressScale={0.98}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-4"
    >
      <Icon name="person.badge.plus" size={22} tone="brand" />
      <AppView className="flex-1">
        <AppText className="text-[14px] font-bold text-foreground">
          {requests.length === 1
            ? `${first.driver.name} wants to join your fleet`
            : `${requests.length} drivers want to join your fleet`}
        </AppText>
        <AppText className="text-[12px] text-muted">Tap to approve or decline</AppText>
      </AppView>
      <Icon name="chevron.right" size={16} tone="icon-subtle" />
    </AppPressable>
  );
}
