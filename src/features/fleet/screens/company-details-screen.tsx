import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard } from 'react-native';
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

import { useFleetStore } from '../use-fleet-store';

const COMPANY_TYPES = [
  'Fleet Owner / Transport',
  'Proprietorship',
  'Private Limited',
  'Partnership',
  'LLP',
  'Individual Fleet',
];

export function CompanyDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const company = useFleetStore.use.company();
  const updateCompany = useFleetStore.use.updateCompany();
  const setDashboardRole = useFleetStore.use.setDashboardRole();

  const [companyName, setCompanyName] = useState(company.companyName || '');
  const [ownerName, setOwnerName] = useState(company.ownerName || '');
  const [phone, setPhone] = useState(
    company.phone ? company.phone.replace(/^\+91/, '').replace(/\D/g, '') : '',
  );
  const [email, setEmail] = useState(company.email || '');
  const [companyType, setCompanyType] = useState(company.companyType || 'Fleet Owner / Transport');
  const [registeredAddress, setRegisteredAddress] = useState(company.registeredAddress || '');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid =
    companyName.trim().length >= 2 &&
    ownerName.trim().length >= 2 &&
    phone.trim().length >= 10 &&
    email.trim().includes('@') &&
    Boolean(companyType) &&
    registeredAddress.trim().length >= 5;

  const handleContinue = () => {
    if (!isValid) {
      Alert.alert('Incomplete details', 'Please fill in all company information to continue.');
      return;
    }
    setIsSubmitting(true);
    updateCompany({
      companyName: companyName.trim(),
      ownerName: ownerName.trim(),
      phone: `+91 ${phone.trim()}`,
      email: email.trim(),
      companyType,
      registeredAddress: registeredAddress.trim(),
      isRegistered: true,
    });
    setDashboardRole('owner');
    setIsSubmitting(false);

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
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />
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

          {/* Submit button & footer */}
          <AppView className="mt-10">
            <Button
              variant="brand"
              label={isSubmitting ? 'Saving...' : 'Continue'}
              onPress={handleContinue}
              disabled={!isValid || isSubmitting}
              loading={isSubmitting}
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
    </AppView>
  );
}
