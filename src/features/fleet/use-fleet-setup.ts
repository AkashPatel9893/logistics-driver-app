import { useFleetCompany, useFleetVehicles } from '@/hooks/use-fleet';

import {
  buildRegistrationSteps,
  isStepDone,
  snapshotFromStatus,
  useDriverDocuments,
  useOnboardingStatus,
  type StepState,
} from '../registration/use-registration';

export interface FleetSetupStep {
  id: 'company' | 'photo' | 'identity' | 'bank' | 'vehicle';
  title: string;
  detail: string | null;
  state: StepState;
  route: string;
  /** Cannot be started yet; `lockedReason` says why. */
  locked: boolean;
  lockedReason: string | null;
}

/**
 * What a fleet owner must finish before the fleet dashboard opens: company, the owner's own
 * selfie and PAN/Aadhaar (verified by the admin), a bank account for payouts and one vehicle.
 * The backend only accepts a vehicle once the selfie and PAN are verified, so that step waits.
 */
export function useFleetSetup() {
  const companyQuery = useFleetCompany();
  const statusQuery = useOnboardingStatus();
  const docsQuery = useDriverDocuments();
  // The backend answers 404 ("Register your fleet company first") until the company exists.
  const companyRegistered = companyQuery.data?.isRegistered === true;
  const vehiclesQuery = useFleetVehicles({ enabled: companyRegistered });

  const loading =
    companyQuery.isPending ||
    statusQuery.isPending ||
    docsQuery.isPending ||
    (companyRegistered && vehiclesQuery.isPending);
  const error =
    companyQuery.isError ||
    statusQuery.isError ||
    docsQuery.isError ||
    (companyRegistered && vehiclesQuery.isError);

  const snapshot = statusQuery.data ? snapshotFromStatus(statusQuery.data) : null;
  const registration = snapshot ? buildRegistrationSteps(snapshot, docsQuery.data, [], null) : [];
  const registrationStep = (id: string) => registration.find((s) => s.id === id);

  const company = companyQuery.data;
  const vehicles = companyRegistered ? (vehiclesQuery.data ?? []) : [];
  const photo = registrationStep('photo');
  const identity = registrationStep('identity');
  const bank = registrationStep('bank');
  const identityVerified = photo?.state === 'verified' && identity?.state === 'verified';

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
        locked: false,
        lockedReason: null,
      },
      { ...photo, id: 'photo', locked: false, lockedReason: null },
      { ...identity, id: 'identity', locked: false, lockedReason: null },
      { ...bank, id: 'bank', locked: false, lockedReason: null },
      {
        id: 'vehicle',
        title: 'Add your first vehicle',
        detail:
          vehicles.length > 0
            ? `${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'} added`
            : !companyRegistered
              ? 'Opens once your company details are added'
              : identityVerified
                ? 'Vehicle number, type and driver'
                : 'Opens once your photo and PAN are verified',
        state: vehicles.length > 0 ? 'verified' : 'todo',
        route: '/setup-vehicle',
        locked: vehicles.length === 0 && (!companyRegistered || !identityVerified),
        lockedReason: !companyRegistered
          ? 'Add your company details first.'
          : 'Your profile photo, PAN and Aadhaar must be verified before you can add a vehicle.',
      },
    );
  }

  // Photo and ID must be verified by the admin; the bank account only needs to be sent in.
  const complete =
    steps.length > 0 &&
    steps.every((s) => (s.id === 'bank' ? isStepDone(s.state) : s.state === 'verified'));
  const nextStep = steps.find((s) =>
    s.id === 'bank' ? !isStepDone(s.state) : s.state !== 'verified',
  );

  const refetch = () =>
    Promise.all([
      companyQuery.refetch(),
      statusQuery.refetch(),
      docsQuery.refetch(),
      ...(companyRegistered ? [vehiclesQuery.refetch()] : []),
    ]);

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
