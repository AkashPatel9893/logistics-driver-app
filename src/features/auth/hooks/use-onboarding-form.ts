import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';

import { driverProfileSchema } from '../schema';
import { signOut, useAuthStore } from '../use-auth-store';

type FieldErrors = { name?: string; phone?: string; dob?: string; city?: string };

/** Stored as +91XXXXXXXXXX; the field shows just the 10 digits. */
function localDigits(phone: string | null | undefined): string {
  return phone?.replace(/^\+91/, '').replace(/\D/g, '') ?? '';
}

export function useOnboardingForm() {
  const router = useRouter();
  const user = useAuthStore.use.user();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(localDigits(user?.phone));
  const [dob, setDob] = useState(user?.dob ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({});

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      useAuthStore.getState().setUser(updated);
      router.replace('/home');
    },
    onError: (error) => Alert.alert('Could not save profile', getErrorMessage(error)),
  });

  const clearError = (field: keyof FieldErrors) =>
    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));

  const handleNameChange = (text: string) => {
    clearError('name');
    setName(text);
  };

  const handlePhoneChange = (text: string) => {
    clearError('phone');
    setPhone(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleDobChange = (text: string) => {
    clearError('dob');
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)} / ${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)} / ${cleaned.slice(2, 4)} / ${cleaned.slice(4, 8)}`;
    }
    setDob(formatted);
  };

  const handleCitySelect = (selectedCity: string) => {
    clearError('city');
    setCity(selectedCity);
  };

  const handleSubmit = () => {
    if (updateProfile.isPending) return;
    const result = driverProfileSchema.safeParse({ name, phone, dob, city });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] ??= issue.message;
      }
      setValidationErrors(errors);
      return;
    }
    updateProfile.mutate(result.data);
  };

  const handleSignOut = () => {
    Alert.alert('Switch Account', 'Are you sure you want to go back and use a different account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch Account',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return {
    name,
    phone,
    dob,
    city,
    isLoading: updateProfile.isPending,
    isFormValid: name.trim().length >= 2 && phone.length === 10 && dob.length === 14 && !!city,
    validationErrors,
    handleNameChange,
    handlePhoneChange,
    handleDobChange,
    handleCitySelect,
    handleSubmit,
    handleSignOut,
  };
}
