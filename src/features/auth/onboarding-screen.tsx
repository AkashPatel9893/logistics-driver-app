import { useState } from 'react';
import { Keyboard } from 'react-native';
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
import { useFleetStore } from '@/features/fleet/use-fleet-store';

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

const COMPANY_TYPES = [
  'Fleet Owner / Transport',
  'Proprietorship',
  'Private Limited',
  'Partnership',
  'LLP',
  'Individual Fleet',
];

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const form = useOnboardingForm();
  const updateCompany = useFleetStore.use.updateCompany();
  const setDashboardRole = useFleetStore.use.setDashboardRole();

  // Registration type choice: individual driver vs company / fleet owner
  const [onboardingType, setOnboardingType] = useState<'driver' | 'owner'>('driver');

  // Individual driver fields
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Company details fields
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState(form.name || '');
  const [companyPhone, setCompanyPhone] = useState(form.phone || '');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyType, setCompanyType] = useState('Fleet Owner / Transport');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const isCompanyValid =
    companyName.trim().length >= 2 &&
    ownerName.trim().length >= 2 &&
    companyPhone.trim().length >= 10 &&
    companyEmail.trim().includes('@') &&
    Boolean(companyType) &&
    registeredAddress.trim().length >= 5;

  const handleCompanySubmit = () => {
    updateCompany({
      companyName: companyName.trim(),
      ownerName: ownerName.trim(),
      phone: `+91 ${companyPhone.trim()}`,
      email: companyEmail.trim(),
      companyType,
      registeredAddress: registeredAddress.trim(),
      isRegistered: true,
    });
    setDashboardRole('owner');

    // Also update driver profile with owner's name and phone
    form.handleNameChange(ownerName);
    form.handlePhoneChange(companyPhone);
    form.handleCitySelect('Bengaluru');
    form.handleSubmit();
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <AppKeyboardAvoidingView>
        <AppScrollView
          style={{ paddingTop: insets.top + 8 }}
          contentContainerClassName="px-6 pb-16"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppView className="mb-4 min-h-[48px] justify-center">
            <LiquidGlassBackButton onPress={form.handleSignOut} />
          </AppView>

          {/* Registration type selector */}
          <AppView row className="mb-6 rounded-2xl border border-border/80 bg-surface-muted p-1">
            <AppPressable
              onPress={() => setOnboardingType('driver')}
              className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                onboardingType === 'driver' ? 'bg-[#FF5722] shadow-sm' : ''
              }`}
            >
              <AppText
                className={`text-[13px] font-bold ${
                  onboardingType === 'driver' ? 'text-white' : 'text-foreground-secondary'
                }`}
              >
                Individual Driver
              </AppText>
            </AppPressable>

            <AppPressable
              onPress={() => setOnboardingType('owner')}
              className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                onboardingType === 'owner' ? 'bg-[#FF5722] shadow-sm' : ''
              }`}
            >
              <AppText
                className={`text-[13px] font-bold ${
                  onboardingType === 'owner' ? 'text-white' : 'text-foreground-secondary'
                }`}
              >
                Fleet Owner / Company
              </AppText>
            </AppPressable>
          </AppView>

          {onboardingType === 'driver' ? (
            /* ================= INDIVIDUAL DRIVER ONBOARDING (SCREENSHOT 2 SCREEN 1) ================= */
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

                <TextField
                  variant="outlined"
                  label="Mobile number"
                  required
                  value={form.phone}
                  onChangeText={form.handlePhoneChange}
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={10}
                  error={form.validationErrors.phone}
                  hint="Customers call this number during a trip."
                  leading={
                    <AppText className="text-[15px] font-bold text-foreground-secondary">
                      +91
                    </AppText>
                  }
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
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowCityPicker((prev) => !prev);
                    }}
                    className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <AppView row className="items-center gap-3">
                      <Icon name="location" size={20} tone="brand" />
                      <AppText className="text-[15px] font-semibold text-foreground">
                        {form.city || 'Choose your city'}
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
                          {form.city === cityItem ? (
                            <Icon name="check" size={16} tone="brand" />
                          ) : null}
                        </AppPressable>
                      ))}
                    </AppView>
                  ) : null}
                  {form.validationErrors.city ? (
                    <AppText className="mt-1.5 text-[12px] font-medium text-error">
                      {form.validationErrors.city}
                    </AppText>
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
                    Your details are kept private and secure.
                  </AppText>
                </AppView>
              </AppView>
            </>
          ) : (
            /* ================= FLEET OWNER / COMPANY ONBOARDING (SCREENSHOT 1 SCREEN 1) ================= */
            <>
              <AppView className="mb-8 mt-2">
                <AppText className="text-[28px] font-extrabold leading-8 tracking-tight text-foreground">
                  Company details
                </AppText>
                <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
                  {"Tell us a little about your company to set up your owner's profile."}
                </AppText>
              </AppView>

              <AppView className="gap-5">
                {/* Company name */}
                <TextField
                  variant="outlined"
                  label="Company name"
                  required
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Enter your company name"
                  autoCapitalize="words"
                  leading={<Icon name="building.2" size={20} tone="icon-subtle" />}
                  inputClassName="ml-2 text-[15px]"
                />

                {/* Owner's name */}
                <TextField
                  variant="outlined"
                  label="Owners name"
                  required
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                  leading={<Icon name="person" size={20} tone="icon-subtle" />}
                  inputClassName="ml-2 text-[15px]"
                />

                {/* Phone number */}
                <TextField
                  variant="outlined"
                  label="Phone number*"
                  required
                  value={companyPhone}
                  onChangeText={(text) => setCompanyPhone(text.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  leading={
                    <AppText className="text-[15px] font-bold text-foreground-secondary">
                      +91
                    </AppText>
                  }
                  inputClassName="ml-2 text-[15px]"
                />

                {/* Email address */}
                <TextField
                  variant="outlined"
                  label="Email address"
                  required
                  value={companyEmail}
                  onChangeText={setCompanyEmail}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leading={<Icon name="envelope" size={20} tone="icon-subtle" />}
                  inputClassName="ml-2 text-[15px]"
                />

                {/* Company type */}
                <AppView>
                  <AppText className="mb-2 text-[13px] font-semibold text-foreground-secondary">
                    Company type
                  </AppText>
                  <AppPressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowTypePicker((prev) => !prev);
                    }}
                    className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <AppView row className="items-center gap-3">
                      <Icon name="briefcase" size={20} tone="icon-subtle" />
                      <AppText className="text-[15px] font-semibold text-foreground">
                        {companyType || 'Select company type'}
                      </AppText>
                    </AppView>
                    <Icon
                      name={showTypePicker ? 'chevron.up' : 'chevron.down'}
                      size={18}
                      tone="icon-subtle"
                    />
                  </AppPressable>

                  {showTypePicker ? (
                    <AppView className="mt-2 rounded-2xl border border-border bg-card p-2 shadow-md">
                      {COMPANY_TYPES.map((typeItem) => (
                        <AppPressable
                          key={typeItem}
                          onPress={() => {
                            setCompanyType(typeItem);
                            setShowTypePicker(false);
                          }}
                          className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
                            companyType === typeItem
                              ? 'bg-[#FF5722]/10'
                              : 'active:bg-neutral-100 dark:active:bg-neutral-800'
                          }`}
                        >
                          <AppText
                            className={`text-[14px] ${
                              companyType === typeItem
                                ? 'font-bold text-[#FF5722]'
                                : 'font-medium text-foreground'
                            }`}
                          >
                            {typeItem}
                          </AppText>
                          {companyType === typeItem ? (
                            <Icon name="check" size={16} tone="brand" />
                          ) : null}
                        </AppPressable>
                      ))}
                    </AppView>
                  ) : null}
                </AppView>

                {/* Registered address */}
                <AppView>
                  <AppText className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">
                    ADDRESS
                  </AppText>
                  <TextField
                    variant="outlined"
                    value={registeredAddress}
                    onChangeText={setRegisteredAddress}
                    placeholder="Enter registered address"
                    multiline
                    numberOfLines={3}
                    inputClassName="text-[15px] min-h-[70px] pt-2"
                  />
                </AppView>
              </AppView>

              <AppView className="mt-10">
                <Button
                  variant="brand"
                  label={form.isLoading ? 'Saving...' : 'Continue'}
                  onPress={handleCompanySubmit}
                  disabled={!isCompanyValid || form.isLoading}
                  loading={form.isLoading}
                  size="lg"
                  textClassName="font-extrabold text-base"
                />

                <AppView row className="mt-5 items-center justify-center gap-1.5">
                  <Icon name="shield" size={14} tone="icon-subtle" />
                  <AppText className="text-center text-[12px] text-muted">
                    Your details are kept private and secure.
                  </AppText>
                </AppView>
              </AppView>
            </>
          )}
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}
