import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';
import { useDriverStore } from '@/stores/driver-store';

import { profileCreationSchema } from '../schema';
import { signOut, useAuthStore } from '../use-auth-store';

type FieldErrors = { name?: string; dob?: string; city?: string };

export function useOnboardingForm() {
  const router = useRouter();
  const user = useAuthStore.use.user();
  const driverState = useDriverStore.getState();

  const [name, setName] = useState(user?.name || driverState.name || '');
  const [dob, setDob] = useState(driverState.dob || '');
  const [city, setCity] = useState(driverState.city || 'Delhi NCR');
  const [validationErrors, setValidationErrors] = useState<FieldErrors>({});

  const updateProfile = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      useAuthStore.getState().setUser(updated);
      useDriverStore.getState().updateDriverDetails({ name, dob, city });
      router.replace('/home');
    },
    onError: (error) => Alert.alert('Could not save profile', getErrorMessage(error)),
  });

  const handleNameChange = (text: string) => {
    setValidationErrors((prev) => ({ ...prev, name: undefined }));
    setName(text);
  };

  const handleDobChange = (text: string) => {
    setValidationErrors((prev) => ({ ...prev, dob: undefined }));
    // Auto format DD / MM / YYYY
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
    setValidationErrors((prev) => ({ ...prev, city: undefined }));
    setCity(selectedCity);
  };

  const handleSubmit = () => {
    if (updateProfile.isPending) return;

    if (!name.trim()) {
      setValidationErrors((prev) => ({ ...prev, name: 'Please enter your full name' }));
      return;
    }

    const phone = user?.phone || '+91 98765 43210';
    const result = profileCreationSchema.safeParse({ name, phone, usageType: 'personal' });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'name') errors.name = issue.message;
      }
      setValidationErrors(errors);
      return;
    }

    useDriverStore.getState().updateDriverDetails({ name, dob, city });
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
    dob,
    city,
    isLoading: updateProfile.isPending,
    isFormValid: name.trim().length >= 2,
    validationErrors,
    handleNameChange,
    handleDobChange,
    handleCitySelect,
    handleSubmit,
    handleSignOut,
  };
}
