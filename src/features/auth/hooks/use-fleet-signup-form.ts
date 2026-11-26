import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { DEFAULT_COMPANY_TYPE, isValidGstin } from '@/features/fleet/company';
import { switchDashboardRole } from '@/features/fleet/switch-role';
import { requestAutoStart } from '@/features/registration/next-step';
import { useRegisterCompany } from '@/hooks/use-fleet';
import { getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';
import { fleetApi } from '@/lib/api/fleet';
import { getDobError } from '@/lib/dob';

import { useAuthStore } from '../use-auth-store';
import { useCityStore } from '../use-city-store';
import { useDobField } from './use-dob-field';

/** Fleet sign-up: creates the owner's partner profile, then registers the company. */
export function useFleetSignupForm() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const registerCompany = useRegisterCompany();
  const dobField = useDobField(user?.dob ?? '');
  const signedInPhone = user?.phone?.replace(/^\+91/, '').replace(/\D/g, '') ?? '';

  const [companySubmitting, setCompanySubmitting] = useState(false);
  // Company details fields
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.name ?? '');
  // The login number is already verified: shown read-only. Editable only if we don't have it.
  const loginPhone = signedInPhone.length === 10 ? signedInPhone : '';
  const [companyPhone, setCompanyPhone] = useState(signedInPhone);
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyType, setCompanyType] = useState(DEFAULT_COMPANY_TYPE);
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const gstinValid = isValidGstin(gstin);

  // GSTIN is optional, but if it is typed it must be valid.
  const gstinOk = gstin.trim().length === 0 || gstinValid;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(companyEmail.trim());

  // Shown under the fields once typed, so a disabled Continue never leaves the owner guessing.
  const gstinError =
    gstin.length === 0
      ? undefined
      : gstin.length < 15
        ? `GSTIN has 15 characters (${gstin.length} entered)`
        : !gstinValid
          ? 'Not a valid GSTIN. Format: 2 digits, 5 letters, 4 digits, letter, digit/letter, Z, digit/letter (e.g. 29ABCDE1234F1Z5)'
          : undefined;
  const emailError =
    companyEmail.trim().length > 0 && !isValidEmail ? 'Enter a valid email address' : undefined;
  const phoneError =
    companyPhone.length > 0 && companyPhone.length < 10 ? 'Enter the 10-digit number' : undefined;

  // What still blocks Continue, listed above the button.
  const missing = [
    companyName.trim().length < 2 && 'company name',
    ownerName.trim().length < 2 && "owner's name",
    getDobError(dobField.dob) && 'date of birth',
    companyPhone.trim().length < 10 && 'phone number',
    !isValidEmail && 'email',
    !gstinOk && 'valid GSTIN',
    registeredAddress.trim().length < 5 && 'address',
  ].filter(Boolean) as string[];
  const isCompanyValid = missing.length === 0 && Boolean(companyType);

  const handleCompanySubmit = async () => {
    if (!isCompanyValid) {
      if (!gstinOk) {
        Alert.alert(
          'Invalid GSTIN',
          'Please enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5).',
        );
        return;
      }
      return;
    }

    if (companySubmitting) return;
    setCompanySubmitting(true);
    try {
      // The company endpoint requires a partner profile. Keep the form open until both
      // steps succeed, so the user can retry if the second request fails.
      const profile = await authApi.updateProfile({
        name: ownerName,
        dob: dobField.dob,
        marketCode: useCityStore.getState().city?.marketCode,
      });
      const company = await fleetApi.getCompany();
      if (
        company.is_registered &&
        gstin.trim() &&
        company.gstin?.toUpperCase() !== gstin.trim().toUpperCase()
      ) {
        throw new Error('A different company is already registered to this account.');
      }
      if (!company.is_registered) {
        await registerCompany.mutateAsync({
          company_name: companyName.trim(),
          owner_name: ownerName.trim(),
          phone: `+91${companyPhone.trim().slice(-10)}`,
          email: companyEmail.trim(),
          company_type: companyType,
          registered_address: registeredAddress.trim(),
          ...(gstin.trim() ? { gstin: gstin.trim().toUpperCase() } : {}),
        });
      }
      switchDashboardRole('owner');
      // Straight into the first Fleet setup step. Requested before setUser, which makes the
      // sign-up layout redirect on its own.
      requestAutoStart();
      useAuthStore.getState().setUser(profile);
      router.replace('/home');
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message === 'A different company is already registered to this account.'
          ? error.message
          : getErrorMessage(error);
      Alert.alert('Registration error', message);
    } finally {
      setCompanySubmitting(false);
    }
  };

  return {
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
  };
}
