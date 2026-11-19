import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { getErrorMessage } from '@/lib/api/api-error';
import { authApi } from '@/lib/api/auth';

import { isAwaitingApproval, useAuthStore } from '../use-auth-store';
import { useFleetStore } from '@/features/fleet/use-fleet-store';
import { goBack } from '@/lib/go-back';

const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_RESEND_SECONDS = 30;

export function useOtpVerification() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; otpLength?: string; resendIn?: string }>();
  const phone = params.phone ?? '';
  const otpLength = Number(params.otpLength) || DEFAULT_OTP_LENGTH;

  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(
    () => Number(params.resendIn) || DEFAULT_RESEND_SECONDS,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // One interval for the whole countdown, not one per tick.
  const isCountingDown = secondsLeft > 0;
  useEffect(() => {
    if (!isCountingDown) return;
    const timer = setInterval(() => setSecondsLeft((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [isCountingDown]);

  const verify = useMutation({
    mutationFn: (otp: string) => authApi.verifyOtp(phone, otp),
    onSuccess: (session) => {
      useAuthStore.getState().signIn(session);
      // The backend remembers the dashboard the partner picked (a UI hint only).
      if (session.selectedRole === 'FLEET_OWNER')
        useFleetStore.getState().setDashboardRole('owner');
      if (session.selectedRole === 'RIDER') useFleetStore.getState().setDashboardRole('driver');
      const isDriver = useFleetStore.getState().dashboardRole === 'driver';
      // Decided from the login response alone: new partner → city first; driver awaiting
      // approval → Documents; everyone else → Home.
      router.replace(
        !session.user.isOnboarded
          ? ('/(auth)/select-city' as any)
          : isDriver && isAwaitingApproval(session.user)
            ? ('/registration' as any)
            : '/home',
      );
    },
    onError: (error) => {
      setValidationError(getErrorMessage(error));
      setCode('');
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.sendOtp(phone),
    onSuccess: (challenge) => {
      setSecondsLeft(challenge.resendInSeconds);
      setCode('');
    },
    onError: (error) => setValidationError(getErrorMessage(error)),
  });

  const handleCodeChange = (value: string) => {
    setValidationError(null);
    setCode(value);
  };

  const handleVerify = (value: string = code) => {
    if (verify.isPending) return;
    if (value.length !== otpLength) {
      setValidationError(`Enter all ${otpLength} digits of the code`);
      return;
    }
    verify.mutate(value);
  };

  const handleResend = () => {
    if (secondsLeft > 0 || resend.isPending) return;
    setValidationError(null);
    resend.mutate();
  };

  return {
    phone,
    otpLength,
    code,
    handleCodeChange,
    secondsLeft,
    isVerifying: verify.isPending,
    isResending: resend.isPending,
    validationError,
    handleVerify,
    handleResend,
    navigateBack: () => goBack(router),
  };
}
