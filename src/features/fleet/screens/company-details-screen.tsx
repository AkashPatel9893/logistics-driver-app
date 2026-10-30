import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard } from 'react-native';
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
import { useFleetCompany, useRegisterCompany } from '@/hooks/use-fleet';
import type { CompanyDetails } from '../types';

import { useFleetStore } from '../use-fleet-store';

const COMPANY_TYPES = [
  'Fleet Owner / Transport',
  'Proprietorship',
  'Private Limited',
  'Partnership',
  'LLP',
  'Individual Fleet',
];

interface CompanyDetailsFormProps {
  initialCompany?: CompanyDetails;
}

function CompanyDetailsForm({ initialCompany }: CompanyDetailsFormProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const registerCompany = useRegisterCompany();
  const setDashboardRole = useFleetStore.use.setDashboardRole();

  const [companyName, setCompanyName] = useState(initialCompany?.companyName || '');
  const [ownerName, setOwnerName] = useState(initialCompany?.ownerName || '');
  const [phone, setPhone] = useState(
    initialCompany?.phone
      ? initialCompany.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)
      : '',
  );
  const [email, setEmail] = useState(initialCompany?.email || '');
  const [companyType, setCompanyType] = useState(
    initialCompany?.companyType || 'Fleet Owner / Transport',
  );
  const [registeredAddress, setRegisteredAddress] = useState(
    initialCompany?.registeredAddress || '',
  );
  const [gstin, setGstin] = useState(initialCompany?.gstin || '');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const isValidGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gstin.trim().toUpperCase(),
  );

  const isValid =
    companyName.trim().length >= 2 &&
    ownerName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    email.trim().includes('@') &&
    Boolean(companyType) &&
    registeredAddress.trim().length >= 5 &&
    isValidGstin;

  const handleContinue = async () => {
    if (!isValid) {
      if (!isValidGstin) {
        Alert.alert(
          'Invalid GSTIN',
          'Please enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5).',
        );
        return;
      }
      Alert.alert('Incomplete details', 'Please fill in all company information to continue.');
      return;
    }

    try {
      await registerCompany.mutateAsync({
        company_name: companyName.trim(),
        owner_name: ownerName.trim(),
        phone: `+91 ${phone.trim().slice(-10)}`,
        email: email.trim(),
        company_type: companyType,
        registered_address: registeredAddress.trim(),
        gstin: gstin.trim().toUpperCase(),
      });
      setDashboardRole('owner');

      Alert.alert(
        'Company profile saved',
        'Your owner profile is ready. You can now add vehicles and assign drivers or drive yourself.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            },
          },
        ],
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || err?.message || 'Failed to save company profile.';
      Alert.alert(
        'Registration Error',
        typeof message === 'string' ? message : JSON.stringify(message),
      );
    }
  };

  return (
    <AppKeyboardAvoidingView>
      <AppScrollView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        contentContainerClassName="px-6 pb-16"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <AppView className="mb-3 min-h-[44px] justify-center">
          <LiquidGlassBackButton onPress={() => router.back()} />
        </AppView>

        {/* Screen Header */}
        <AppView className="mb-6">
          <AppText className="text-[28px] font-black leading-tight tracking-tight text-foreground">
            Company details
          </AppText>
          <AppText className="mt-1.5 text-[15px] leading-5 text-muted">
            {"Tell us a little about your company to set up your owner's profile."}
          </AppText>
        </AppView>

        {/* Form Fields */}
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
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            leading={
              <AppText className="text-[15px] font-bold text-foreground-secondary">+91</AppText>
            }
            inputClassName="ml-2 text-[15px]"
          />

          {/* Email address */}
          <TextField
            variant="outlined"
            label="Email address"
            required
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leading={<Icon name="envelope" size={20} tone="icon-subtle" />}
            inputClassName="ml-2 text-[15px]"
          />

          {/* GSTIN */}
          <TextField
            variant="outlined"
            label="GSTIN"
            required
            value={gstin}
            onChangeText={(text) =>
              setGstin(
                text
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 15),
              )
            }
            placeholder="e.g. 29ABCDE1234F1Z5"
            autoCapitalize="characters"
            autoCorrect={false}
            leading={<Icon name="document" size={20} tone="icon-subtle" />}
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
                    {companyType === typeItem ? <Icon name="check" size={16} tone="brand" /> : null}
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

        {/* Submit button & footer */}
        <AppView className="mt-10">
          <Button
            variant="brand"
            label={registerCompany.isPending ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={!isValid || registerCompany.isPending}
            loading={registerCompany.isPending}
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
      </AppScrollView>
    </AppKeyboardAvoidingView>
  );
}

export function CompanyDetailsScreen() {
  const { data: company, isLoading } = useFleetCompany();

  if (isLoading) {
    return (
      <AppView className="flex-1 items-center justify-center bg-background p-6">
        <FocusAwareStatusBar />
        <AppSpinner size="large" />
      </AppView>
    );
  }

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
      <CompanyDetailsForm key={company?.id ?? 'new'} initialCompany={company} />
    </AppView>
  );
}
