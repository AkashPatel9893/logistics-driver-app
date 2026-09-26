import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  TextField,
} from '@/components/ui';

import { useOnboardingForm } from './hooks/use-onboarding-form';

const POPULAR_CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const form = useOnboardingForm();
  const [showCityPicker, setShowCityPicker] = useState(false);

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppKeyboardAvoidingView>
        <AppScrollView
          style={{ paddingTop: insets.top + 8 }}
          contentContainerClassName="px-6 pb-12"
          showsVerticalScrollIndicator={false}
        >
          <AppView className="mb-4 min-h-[48px] justify-center">
            <LiquidGlassBackButton onPress={form.handleSignOut} />
          </AppView>

          <AppView className="mb-8 mt-2">
            <AppText className="text-[28px] font-extrabold leading-8 tracking-tight text-foreground">
              Driver details
            </AppText>
            <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
              Enter your personal details to get started
            </AppText>
          </AppView>

          <AppView className="gap-5">
            {/* Full Name */}
            <TextField
              variant="outlined"
              label="Full Name"
              required
              value={form.name}
              onChangeText={form.handleNameChange}
              placeholder="Enter your full name"
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect={false}
              error={form.validationErrors.name}
              leading={<Icon name="person" size={20} tone="icon-subtle" />}
              inputClassName="ml-2 text-[15px]"
            />

            {/* Date of Birth */}
            <TextField
              variant="outlined"
              label="Date of birth"
              required
              value={form.dob}
              onChangeText={form.handleDobChange}
              placeholder="DD / MM / YYYY"
              keyboardType="number-pad"
              maxLength={14}
              error={form.validationErrors.dob}
              leading={<Icon name="calendar" size={20} tone="icon-subtle" />}
              inputClassName="ml-2 text-[15px]"
            />

            {/* Location / City */}
            <AppView>
              <AppText className="mb-2 text-[13px] font-semibold text-foreground-secondary">
                Location
              </AppText>
              <AppPressable
                onPress={() => setShowCityPicker((prev) => !prev)}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <AppView row className="items-center gap-3">
                  <Icon name="location" size={20} tone="brand" />
                  <AppText className="text-[15px] font-semibold text-foreground">
                    {form.city || 'Select city'}
                  </AppText>
                </AppView>
                <Icon
                  name={showCityPicker ? 'chevron.up' : 'chevron.down'}
                  size={18}
                  tone="icon-subtle"
                />
              </AppPressable>

              {showCityPicker ? (
                <AppView className="mt-2 rounded-2xl border border-border bg-card p-2 shadow-md">
                  {POPULAR_CITIES.map((cityItem) => (
                    <AppPressable
                      key={cityItem}
                      onPress={() => {
                        form.handleCitySelect(cityItem);
                        setShowCityPicker(false);
                      }}
                      className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
                        form.city === cityItem
                          ? 'bg-brand/10'
                          : 'active:bg-neutral-100 dark:active:bg-neutral-800'
                      }`}
                    >
                      <AppText
                        className={`text-[14px] ${
                          form.city === cityItem
                            ? 'font-bold text-brand'
                            : 'font-medium text-foreground'
                        }`}
                      >
                        {cityItem}
                      </AppText>
                      {form.city === cityItem ? <Icon name="check" size={16} tone="brand" /> : null}
                    </AppPressable>
                  ))}
                </AppView>
              ) : null}
            </AppView>
          </AppView>

          <AppView className="mt-10">
            <Button
              label={form.isLoading ? 'Saving...' : 'Continue'}
              onPress={form.handleSubmit}
              disabled={!form.isFormValid}
              loading={form.isLoading}
              size="lg"
              textClassName="font-bold text-base"
            />

            <AppView row className="mt-5 items-center justify-center gap-1.5">
              <Icon name="shield" size={14} tone="icon-subtle" />
              <AppText className="text-center text-[12px] text-muted">
                Your details are encrypted and secure
              </AppText>
            </AppView>
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
