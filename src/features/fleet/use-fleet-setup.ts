import { useFleetCompany } from '@/hooks/use-fleet';

import {
  buildRegistrationSteps,
  isStepDone,
  snapshotFromStatus,
  type StepState,
} from '../registration/registration-steps';
import { useDriverDocuments, useOnboardingStatus } from '../registration/use-registration';

export interface FleetSetupStep {
  id: 'company' | 'photo' | 'identity' | 'bank';
  title: string;
  detail: string | null;
  state: StepState;
  route: string;
}

/**
 * What a fleet owner must finish before the fleet dashboard opens: company, the owner's own
 * selfie and PAN/Aadhaar (verified by the admin) and a bank account for payouts. Vehicles are
 * added later from the dashboard.
 */
export function useFleetSetup() {
  const companyQuery = useFleetCompany();
  const statusQuery = useOnboardingStatus();
  const docsQuery = useDriverDocuments();

  const loading = companyQuery.isPending || statusQuery.isPending || docsQuery.isPending;
  const error = companyQuery.isError || statusQuery.isError || docsQuery.isError;

  const snapshot = statusQuery.data ? snapshotFromStatus(statusQuery.data) : null;
  const registration = snapshot ? buildRegistrationSteps(snapshot, docsQuery.data, [], null) : [];
  const registrationStep = (id: string) => registration.find((s) => s.id === id);

  const company = companyQuery.data;
  const photo = registrationStep('photo');
  const identity = registrationStep('identity');
  const bank = registrationStep('bank');

  const steps: FleetSetupStep[] = [];
  if (snapshot && photo && identity && bank) {
    steps.push(
      {
        id: 'company',
        title: 'Company details',
        detail: company?.isRegistered
          ? company.companyName
          : 'Company name and address. GSTIN is optional',
        state: company?.isRegistered ? 'verified' : 'todo',
        route: '/company-details',
      },
      { ...photo, id: 'photo' },
      { ...identity, id: 'identity' },
      { ...bank, id: 'bank' },
    );
  }

  // Photo and ID must be verified by the admin; the bank account only needs to be sent in.
  const complete =
    steps.length > 0 &&
    steps.every((s) => (s.id === 'bank' ? isStepDone(s.state) : s.state === 'verified'));
  // Highlighted: the first step the owner can still act on, not one waiting for review.
  const nextStep = steps.find((s) => !isStepDone(s.state));

  const refetch = () =>
    Promise.all([companyQuery.refetch(), statusQuery.refetch(), docsQuery.refetch()]);

  return {
    loading,
    error,
    steps,
    complete,
    nextStepId: nextStep?.id ?? null,
    /** The owner's own driver application is approved, so Rider mode is open to them. */
    riderApproved: snapshot?.onboarding.status === 'approved',
    refetch,
  };
}
