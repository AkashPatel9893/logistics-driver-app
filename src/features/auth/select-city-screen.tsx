import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppSpinner,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  TextField,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/api-error';
import { cityApi, type CityMatch, type CitySuggestion } from '@/lib/api/city';

import { useCityStore } from './use-city-store';

/** After login, before the role choice: the city the partner will work in. */
export function SelectCityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useCityStore.use.city();
  const setCity = useCityStore.use.setCity();
  const [picked, setPicked] = useState<CityMatch | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const detected = useQuery({
    queryKey: ['city', 'detect'],
    queryFn: cityApi.detect,
    // Shown instantly when this device detected the city before; no new API calls.
    initialData: cityApi.cached() ?? undefined,
    enabled: !saved,
    retry: false,
    staleTime: Infinity,
  });

  const city: CityMatch | null =
    picked ??
    (saved ? { name: saved.name, marketCode: saved.marketCode } : (detected.data ?? null));
  const detecting = !picked && !saved && detected.isLoading;
  const notServiceable = city !== null && !city.marketCode;

  const handleConfirm = () => {
    if (!city?.marketCode) return;
    setCity({ name: city.name, marketCode: city.marketCode });
    router.push('/(auth)/choose-role');
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppView style={{ paddingTop: Math.max(insets.top, 12) + 4 }} className="px-5 pb-3 pt-2">
        <AppText className="text-[20px] font-black text-foreground">Select City</AppText>
      </AppView>

      <AppView className="flex-1 px-5 pt-4">
        <AppView className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
          <Icon name="mappin.circle.fill" size={34} tone="brand" />
        </AppView>
        <AppText className="mt-5 text-[18px] font-bold text-foreground">
          Which city do you want to drive in?
        </AppText>

        <AppView
          className={`mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-4 ${
            notServiceable
              ? 'border-red-300 bg-red-500/5'
              : 'border-[#BFD5F2] bg-[#EEF4FC] dark:bg-[#132339]'
          }`}
        >
          {detecting ? (
            <>
              <AppSpinner size="small" />
              <AppText className="flex-1 text-[15px] text-muted">Finding your city…</AppText>
            </>
          ) : (
            <>
              <Icon name="location" size={22} color={notServiceable ? '#dc2626' : '#16a34a'} />
              <AppText className="flex-1 text-[18px] font-bold text-foreground" numberOfLines={1}>
                {city?.name ?? 'Choose your city'}
              </AppText>
              <AppPressable onPress={() => setSearchOpen(true)} accessibilityRole="button">
                <AppText className="text-[13px] font-bold tracking-wide text-[#2563eb] underline">
                  {city ? 'CHANGE' : 'SELECT'}
                </AppText>
              </AppPressable>
            </>
          )}
        </AppView>

        {notServiceable ? (
          <AppText className="mt-2 text-[13px] font-medium text-red-600 dark:text-red-400">
            {`RYNO is not available in ${city?.name} yet. Choose another city.`}
          </AppText>
        ) : null}
        {detected.isError && !city ? (
          <AppText className="mt-2 text-[13px] text-muted">
            Could not detect your location. Tap SELECT to search for your city.
          </AppText>
        ) : null}
      </AppView>

      <AppView style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }} className="px-5 pt-3">
        <Button
          variant="brand"
          label="Confirm City"
          onPress={handleConfirm}
          disabled={!city?.marketCode}
          size="lg"
          textClassName="font-extrabold text-base"
        />
      </AppView>

      <CitySearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(match) => {
          setPicked(match);
          setSearchOpen(false);
        }}
      />
    </AppView>
  );
}

function CitySearchModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (city: CityMatch) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  // Wait for a pause in typing before searching: each search is a billed maps call.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const results = useQuery({
    queryKey: ['city', 'search', query],
    queryFn: ({ signal }) => cityApi.search(query, signal),
    enabled: query.length >= 2,
  });

  const pick = async (s: CitySuggestion) => {
    setResolving(s.id);
    try {
      const match = await cityApi.resolve(s);
      if (!match.marketCode) {
        Alert.alert('Not available yet', `RYNO is not available in ${s.name} yet.`);
        return;
      }
      onPick(match);
      setText('');
    } catch (e) {
      Alert.alert('Could not select city', getErrorMessage(e));
    } finally {
      setResolving(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <AppView
        className="flex-1 bg-background"
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
      >
        <AppView row className="gap-3 px-5 pb-3">
          <LiquidGlassBackButton onPress={onClose} />
          <AppText className="text-[20px] font-black text-foreground">Search city</AppText>
        </AppView>
        <AppKeyboardAvoidingView>
          <AppView className="px-5">
            <TextField
              variant="outlined"
              value={text}
              onChangeText={setText}
              placeholder="Type your city name"
              autoFocus
              autoCorrect={false}
              leading={<Icon name="magnifyingglass" size={18} tone="icon-subtle" />}
              inputClassName="ml-2"
            />
          </AppView>
          <AppScrollView
            contentContainerClassName="gap-2 px-5 pb-10 pt-3"
            keyboardShouldPersistTaps="handled"
          >
            {results.isFetching ? <AppSpinner className="mt-6" /> : null}
            {(results.data ?? []).map((s) => (
              <AppPressable
                key={s.id}
                onPress={() => pick(s)}
                disabled={resolving !== null}
                className="flex-row items-center gap-3 rounded-2xl border border-border/80 bg-surface px-4 py-3.5"
              >
                <Icon name="location" size={18} tone="icon-subtle" />
                <AppView className="flex-1">
                  <AppText className="text-[15px] font-bold text-foreground">{s.name}</AppText>
                  <AppText className="text-[12px] text-muted" numberOfLines={1}>
                    {s.address}
                  </AppText>
                </AppView>
                {resolving === s.id ? <AppSpinner size="small" /> : null}
              </AppPressable>
            ))}
            {query.length >= 2 && results.isSuccess && results.data.length === 0 ? (
              <AppText className="mt-6 text-center text-[14px] text-muted">
                No matching city found.
              </AppText>
            ) : null}
          </AppScrollView>
        </AppKeyboardAvoidingView>
      </AppView>
    </Modal>
  );
}
