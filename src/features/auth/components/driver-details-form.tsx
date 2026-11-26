import { AppText, AppView, Button, Icon, TextField } from '@/components/ui';

import { useOnboardingForm } from '../hooks/use-onboarding-form';
import { useCityStore } from '../use-city-store';

/** Sign-up form for a rider: name and date of birth (the login number is read-only). */
export function DriverDetailsForm() {
  const form = useOnboardingForm();
  const cityName = useCityStore((state) => state.city?.name);

  return (
    <>
      <AppView className="mb-8 mt-2">
        <AppText className="text-[28px] font-extrabold leading-8 tracking-tight text-foreground">
          Driver details
        </AppText>
        <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
          Tell us a little about yourself to set up your driver profile.
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

        <AppView className="opacity-60">
          <TextField
            variant="outlined"
            label="Mobile number"
            required
            value={form.phone}
            editable={false}
            accessibilityState={{ disabled: true }}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
            error={form.validationErrors.phone}
            hint="Your login number cannot be changed here."
            leading={
              <AppText className="text-[15px] font-bold text-foreground-secondary">+91</AppText>
            }
            inputClassName="ml-2 text-[15px]"
          />
        </AppView>

        {/* Date of Birth */}
        <TextField
          variant="outlined"
          label="Date of birth"
          required
          value={form.dob}
          onChangeText={form.handleDobChange}
          onBlur={form.handleDobBlur}
          placeholder="DD / MM / YYYY"
          keyboardType="number-pad"
          maxLength={14}
          error={form.validationErrors.dob}
          leading={<Icon name="calendar" size={20} tone="icon-subtle" />}
          inputClassName="ml-2 text-[15px]"
        />
      </AppView>

      {cityName ? (
        <AppView row className="mt-5 items-center gap-2">
          <Icon name="location" size={15} tone="icon-subtle" />
          <AppText className="text-[13px] text-muted">
            Working in <AppText className="font-bold text-foreground">{cityName}</AppText>
          </AppText>
        </AppView>
      ) : null}

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
            Your details are kept private and secure.
          </AppText>
        </AppView>
      </AppView>
    </>
  );
}
