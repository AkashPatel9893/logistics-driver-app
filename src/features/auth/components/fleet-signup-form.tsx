import { AppText, AppView, Button, Icon, TextField } from '@/components/ui';
import { CompanyTypePicker } from '@/features/fleet/components/company-type-picker';

import { useFleetSignupForm } from '../hooks/use-fleet-signup-form';
import { useCityStore } from '../use-city-store';

/** Sign-up form for a fleet owner: their own details and the company's. */
export function FleetSignupForm() {
  const cityName = useCityStore((state) => state.city?.name);
  const {
    dobField,
    loginPhone,
    companyName,
    setCompanyName,
    ownerName,
    setOwnerName,
    companyPhone,
    setCompanyPhone,
    companyEmail,
    setCompanyEmail,
    companyType,
    setCompanyType,
    registeredAddress,
    setRegisteredAddress,
    gstin,
    setGstin,
    gstinError,
    emailError,
    phoneError,
    missing,
    isCompanyValid,
    companySubmitting,
    handleCompanySubmit,
  } = useFleetSignupForm();

  return (
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
          label="Your full name (owner)"
          required
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="As on your PAN or ID"
          hint="Used for your partner profile and as the company owner"
          autoCapitalize="words"
          leading={<Icon name="person" size={20} tone="icon-subtle" />}
          inputClassName="ml-2 text-[15px]"
        />

        <TextField
          variant="outlined"
          label="Date of birth"
          required
          value={dobField.dob}
          onChangeText={dobField.handleChange}
          onBlur={dobField.handleBlur}
          placeholder="DD / MM / YYYY"
          keyboardType="number-pad"
          maxLength={14}
          leading={<Icon name="calendar" size={20} tone="icon-subtle" />}
          inputClassName="ml-2 text-[15px]"
          error={dobField.error}
        />
        {cityName ? (
          <AppText className="text-[13px] text-muted">
            Operating city: <AppText className="font-bold text-foreground">{cityName}</AppText>
          </AppText>
        ) : null}

        {/* Phone number: the login number, already verified by OTP */}
        <AppView className={loginPhone ? 'opacity-60' : ''}>
          <TextField
            variant="outlined"
            label="Phone number"
            required
            value={companyPhone}
            onChangeText={(text) => setCompanyPhone(text.replace(/\D/g, '').slice(0, 10))}
            editable={!loginPhone}
            placeholder="Enter your phone number"
            error={phoneError}
            hint={loginPhone ? 'Your login number, verified by OTP.' : undefined}
            keyboardType="phone-pad"
            leading={
              <AppText className="text-[15px] font-bold text-foreground-secondary">+91</AppText>
            }
            inputClassName="ml-2 text-[15px]"
          />
        </AppView>

        {/* Email address */}
        <TextField
          variant="outlined"
          label="Email address"
          required
          value={companyEmail}
          onChangeText={setCompanyEmail}
          placeholder="Enter your email address"
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
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
          error={gstinError}
          hint="Add it if your business is GST registered. 15 characters."
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
            placeholder="Enter your registered address"
            multiline
            numberOfLines={3}
            inputClassName="text-[15px] min-h-[70px] pt-2"
          />
        </AppView>
      </AppView>

      <AppView className="mt-10">
        {missing.length > 0 ? (
          <AppText className="mb-3 text-center text-[13px] text-muted">
            Still needed: {missing.join(', ')}
          </AppText>
        ) : null}
        <Button
          variant="brand"
          label={companySubmitting ? 'Saving...' : 'Continue'}
          onPress={handleCompanySubmit}
          disabled={!isCompanyValid || companySubmitting}
          loading={companySubmitting}
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
  );
}
