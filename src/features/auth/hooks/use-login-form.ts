import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';
import { kvStorage, STORAGE_KEYS } from '@/lib/storage';

import { phoneLoginSchema } from '../schema';

export function useLoginForm() {
  const router = useRouter();

  const [phone, setPhone] = useState(() => kvStorage.getString(STORAGE_KEYS.CACHED_PHONE) ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendOtp = useMutation({ mutationFn: (value: string) => authApi.sendOtp(value) });
  const isPhoneValid = phoneLoginSchema.safeParse({ phone }).success;
  // Says why Continue is still disabled, instead of leaving a grey button unexplained.
  const phoneHint =
    phone.length === 0 || isPhoneValid
      ? null
      : phone.length < 10
        ? `Enter ${10 - phone.length} more ${10 - phone.length === 1 ? 'digit' : 'digits'}`
        : 'Indian mobile numbers start with 6, 7, 8 or 9';

  const handlePhoneChange = (text: string) => {
    setValidationError(null);
    // Digits only; a pasted "+91 98765 43210" keeps its last 10.
    setPhone(text.replace(/\D/g, '').slice(-10));
  };

  const handleContinue = () => {
    if (sendOtp.isPending) return;
    setValidationError(null);
    const parsed = phoneLoginSchema.safeParse({ phone });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Enter a valid 10-digit mobile number');
      return;
    }
    const cleanPhone = parsed.data.phone;
    kvStorage.setString(STORAGE_KEYS.CACHED_PHONE, cleanPhone);
    sendOtp.mutate(cleanPhone, {
      onSuccess: (challenge) =>
        router.push({
          pathname: '/otp',
          params: {
            phone: cleanPhone,
            otpLength: String(challenge.otpLength),
            resendIn: String(challenge.resendInSeconds),
          },
        }),
      onError: (error) => setValidationError(getErrorMessage(error)),
    });
  };

  return {
    phone,
    isLoading: sendOtp.isPending,
    validationError,
    isPhoneValid,
    phoneHint,
    handlePhoneChange,
    handleContinue,
  };
}
