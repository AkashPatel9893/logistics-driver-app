import { useRouter } from 'expo-router';
import { switchDashboardRole } from '@/features/fleet/switch-role';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
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
import { useFleetCompany, useRegisterCompany, useUpdateCompany } from '@/hooks/use-fleet';
import { DEFAULT_COMPANY_TYPE, isValidGstin } from '../company';
import { CompanyTypePicker } from '../components/company-type-picker';
import type { CompanyDetails } from '../types';

import { ApiError } from '@/lib/api/api-error';
import type { CompanyUpdateRequest } from '@/lib/api/fleet';
import { goBack } from '@/lib/go-back';

interface CompanyDetailsFormProps {
  initialCompany?: CompanyDetails;
}

function CompanyDetailsForm({ initialCompany }: CompanyDetailsFormProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const registerCompany = useRegisterCompany();
  const updateCompany = useUpdateCompany();

  const [companyName, setCompanyName] = useState(initialCompany?.companyName || '');
  const [ownerName, setOwnerName] = useState(initialCompany?.ownerName || '');
  const [phone, setPhone] = useState(
    initialCompany?.phone
      ? initialCompany.phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)
      : '',
  );
  const [email, setEmail] = useState(initialCompany?.email || '');
  const [companyType, setCompanyType] = useState(
    initialCompany?.companyType || DEFAULT_COMPANY_TYPE,
  );
  const [registeredAddress, setRegisteredAddress] = useState(
    initialCompany?.registeredAddress || '',
  );
  const [gstin, setGstin] = useState(initialCompany?.gstin || '');

  // GSTIN is optional, but if it is typed it must be valid.
  const gstinOk = gstin.trim().length === 0 || isValidGstin(gstin);

  const isValid =
    companyName.trim().length >= 2 &&
    ownerName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    email.trim().includes('@') &&
    Boolean(companyType) &&
    registeredAddress.trim().length >= 5 &&
    gstinOk;

  const isEditing = initialCompany?.isRegistered === true;
  const saving = registerCompany.isPending || updateCompany.isPending;

  /** Only what the owner actually changed, so one edit never rewrites the rest. */
  const changedFields = (): CompanyUpdateRequest => {
    const initial = initialCompany;
    const digits = (value: string) => value.replace(/\D/g, '').slice(-10);
    const changes: CompanyUpdateRequest = {};
    if (companyName.trim() !== (initial?.companyName ?? ''))
      changes.company_name = companyName.trim();
    if (ownerName.trim() !== (initial?.ownerName ?? '')) changes.owner_name = ownerName.trim();
    if (digits(phone) !== digits(initial?.phone ?? '')) changes.phone = `+91 ${digits(phone)}`;
    if (email.trim() !== (initial?.email ?? '')) changes.email = email.trim();
    if (companyType !== (initial?.companyType ?? '')) changes.company_type = companyType;
    if (registeredAddress.trim() !== (initial?.registeredAddress ?? '')) {
      changes.registered_address = registeredAddress.trim();
    }
    if (gstin.trim().toUpperCase() !== (initial?.gstin ?? '').toUpperCase() && gstin.trim()) {
      changes.gstin = gstin.trim().toUpperCase();
    }
    return changes;
  };

  const handleContinue = async () => {
    if (!isValid) {
      if (!gstinOk) {
        Alert.alert(
          'Invalid GSTIN',
          'Please enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5), or leave it empty.',
        );
        return;
      }
      Alert.alert('Incomplete details', 'Please fill in all the required company information.');
      return;
    }

    try {
      if (isEditing) {
        const changes = changedFields();
        if (Object.keys(changes).length === 0) {
          Alert.alert('Nothing to save', 'You have not changed anything.');
          return;
        }
        await updateCompany.mutateAsync(changes);
      } else {
        await registerCompany.mutateAsync({
          company_name: companyName.trim(),
          owner_name: ownerName.trim(),
          phone: `+91 ${phone.trim().slice(-10)}`,
          email: email.trim(),
          company_type: companyType,
          registered_address: registeredAddress.trim(),
          ...(gstin.trim() ? { gstin: gstin.trim().toUpperCase() } : {}),
        });
        switchDashboardRole('owner');
      }

      Alert.alert(
        isEditing ? 'Company details updated' : 'Company profile saved',
        isEditing
          ? 'Your changes have been saved.'
          : 'Your owner profile is ready. You can now add vehicles and assign drivers or drive yourself.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (router.canGoBack()) {
                goBack(router);
              } else {
                router.replace('/(tabs)/home');
              }
            },
          },
        ],
      );
    } catch (err: any) {
      const notAvailable = err instanceof ApiError && [404, 405, 501].includes(err.status ?? 0);
      const message = notAvailable
        ? "Editing company details isn't available yet. Please contact support to change them."
        : err?.response?.data?.detail || err?.message || 'Failed to save company profile.';
      Alert.alert(
        isEditing ? 'Could not save changes' : 'Registration Error',
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
          <LiquidGlassBackButton onPress={() => goBack(router)} />
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
            label="Phone number"
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
            label="GSTIN (optional)"
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

          <CompanyTypePicker value={companyType} onChange={setCompanyType} />

          {/* Registered address */}
          <AppView>
            <AppText className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">
              ADDRESS <AppText className="text-brand">*</AppText>
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
            label={saving ? 'Saving...' : isEditing ? 'Save changes' : 'Continue'}
            onPress={handleContinue}
            disabled={!isValid || saving}
            loading={saving}
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
