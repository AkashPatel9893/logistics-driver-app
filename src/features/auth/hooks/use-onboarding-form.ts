import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { requestAutoStart } from '@/features/registration/next-step';
import { useState } from 'react';
import { Alert } from 'react-native';

import { getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';

import { driverProfileSchema } from '../schema';
import { useAuthStore } from '../use-auth-store';
import { useCityStore } from '../use-city-store';
import { useDobField } from './use-dob-field';

type FieldErrors = { name?: string; phone?: string; dob?: string };

/** Stored as +91XXXXXXXXXX; the field shows just the 10 digits. */
function localDigits(phone: string | null | undefined): string {
  return phone?.replace(/^\+91/, '').replace(/\D/g, '') ?? '';
}

export function useOnboardingForm() {
  const router = useRouter();
  const user = useAuthStore.use.user();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(localDigits(user?.phone));
  const dobField = useDobField(user?.dob ?? '');
  const { dob } = dobField;
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({});

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      // Straight into the first document step (Documents stays underneath for back / resume).
      // Requested before setUser: saving the profile makes the sign-up layout redirect to
      // Documents on its own, and that screen must already know to open the first step.
      requestAutoStart();
      useAuthStore.getState().setUser(updated);
      // A driver stays in registration until approved (see Home).
      router.replace('/registration');
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

  const handleSubmit = () => {
    if (updateProfile.isPending) return;
    const result = driverProfileSchema.safeParse({ name, phone, dob });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] ??= issue.message;
      }
      setValidationErrors(errors);
      if (errors.dob) dobField.setError(errors.dob);
      return;
    }
    updateProfile.mutate({
      ...result.data,
      marketCode: useCityStore.getState().city?.marketCode,
    });
  };

  return {
    name,
    phone,
    dob,
    isLoading: updateProfile.isPending,
    isFormValid: name.trim().length >= 2 && phone.length === 10 && dob.length === 14,
    validationErrors: { ...validationErrors, dob: dobField.error },
    handleNameChange,
    handlePhoneChange,
    handleDobChange: dobField.handleChange,
    handleDobBlur: dobField.handleBlur,
    handleSubmit,
  };
}
