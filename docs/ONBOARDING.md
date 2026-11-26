# Partner onboarding: context and flow

The one reference for rider and fleet-owner onboarding in this app. Update it when the flow changes.
Backend paths are relative to `../ryno-logis-fastapi-backend/backend/app`.

## Flow

```
Login (phone) → OTP → Select city → Choose role
  Rider: Select vehicle → Driver details ──────► Driving licence → Profile photo → Vehicle & RC
                                                  → PAN & Aadhaar → Bank → Documents → Submit for review
  Fleet: Company details (creates profile + company) ─► Profile photo → PAN & Aadhaar → Bank
                                                  → Fleet setup → (ops verify) → Dashboard
```

- A returning partner skips city and role. A rider awaiting approval opens on **Documents**
  (`/registration`); a fleet owner with unfinished setup opens on **Fleet setup** (`/fleet-setup`).
- Permissions is a row on Documents, not part of the automatic sequence.

## Auto-start (first run only)

Right after sign-up the first pending step opens by itself, and each submit opens the next one. The
checklist shows only when nothing is left, on back, or after an app restart.

- `requestAutoStart()` is called before `setUser()` in both sign-up hooks. The order matters:
  `setUser` makes the auth layout redirect straight away.
- `useAutoStartStep()` (used by Documents and Fleet setup) shows a plain spinner meanwhile.
  Sign-up can mount the checklist twice; the second copy waits before showing its list.
- The flag lives in memory only, so a restart never auto-opens a step.
- `goToNextStep()` picks the next pending step. For a fleet owner it only walks `photo`,
  `identity`, `bank`, then goes back.

## What counts as done

|                                        | Rider                               | Fleet owner (to open the dashboard)                                  |
| -------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Step is "done" (skipped by auto-start) | submitted, under review or verified | same                                                                 |
| Unlock                                 | admin approves the application      | company saved; selfie, PAN, Aadhaar **verified**; bank **submitted** |

## Backend rules (`modules/`)

- Submit (`partner_onboarding/service.py`): bank must be `VERIFIED` or `MANUAL_REVIEW`. A fleet
  owner also needs at least one fleet vehicle (`FLEET_VEHICLES`).
- Approve and go online (`partner_onboarding/eligibility.py`): bank must be `VERIFIED` unless
  `ELIGIBILITY_REQUIRES_VERIFIED_BANK=false`.
- Add fleet vehicle, vehicle documents, assign driver, approve link request
  (`fleet/service.py::_require_owner_kyc`): owner's selfie and PAN `VERIFIED`, else 403
  `FLEET_OWNER_KYC_INCOMPLETE`. No exception for the first vehicle.
- A rider adding their own vehicle has no document check.
- PAN, driving licence and RC go to a verification provider; selfie and Aadhaar go to manual
  review in the CMS.

## Errors the partner sees

- A refused document shows the backend's `rejection_reason` through
  `lib/api/rejection-reason.ts`: provider codes are translated, reviewer text is kept, unknown codes
  fall back to a general message.
- Throw `ApiError` for user-facing text; `getErrorMessage` replaces a plain `Error` with
  "Something went wrong".
- A refused bank account has no reason from the backend. The bank screen stays open and says it
  could not be verified.

## Decisions

- Onboarding work does not change the backend. Backend needs go in
  [BACKEND_ONBOARDING_TODO.md](../../BACKEND_ONBOARDING_TODO.md).
- Fleet setup has **no vehicle step**. Vehicles are added later from the dashboard, where the
  backend rule above still applies.
- Known gap: because of `FLEET_VEHICLES`, a fleet owner without a vehicle cannot submit a driver
  application. Changing that needs a backend change and deploy.

- The owner's Home shows the fleet vehicle section only; Fleet setup already covers the owner's
  own account, so there is no driver checklist.
- Logout forgets the saved dashboard role. A login without `selected_role` gets the account's own
  saved mode from the backend; sending another account's choice would overwrite it.
- Fleet setup redirects to the dashboard only while its list is focused.
- A refused bank account keeps the bank screen open. Documents says "Ready to submit" until the
  rider submits.

## QA record: 26 November 2026

Android emulator, Bangalore, server `54-252-167-25.sslip.io`. Test accounts: fleet `9000045871`
(`QA Fleet Test`), rider `9000045872` (`QA Test Rider`, scooter `KA01QA4567`). Photos are emulator
test images; approvals use reason `QA_TEST` / `QA test rider`.

Passed: rider and fleet sign-up, step-to-step auto-advance, no list flash after rider sign-up
(screen recording), fleet list after back and restart, under-18 rejection, CMS document review,
rider application approval, approved rider opening Home after restart.

Still to check:

- Fixed after the fleet run, not re-run end to end: fleet popup → dashboard, role not carried over
  after logout, refused-bank message, "Ready to submit" banner, document rejection reasons.
- "Go to Home" first tap after approval seemed to stay on Documents. Each `replace('/home')` was
  stacking another copy of the tabs; the button now clears the stack first (checked: three copies
  became one). The original tap was not reproduced, so re-check it on the next new rider. Other
  `replace('/home')` calls may stack the same way and were not checked.
- Saving a fleet vehicle, going online, iOS.
- Login keyboard nearly covers Continue. The fleet vehicle form says "you'll use for deliveries".

## Code map (`src/`)

| Path                                           | Holds                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/`                                         | Routes only (thin re-exports). `app/(auth)/` is sign-up; its `_layout` guards it    |
| `app/(tabs)/_layout.tsx`                       | Redirects: unapproved rider → Documents, `OwnerSetupGate` → Fleet setup             |
| `features/auth/onboarding-screen.tsx`          | Shell; picks the form by role                                                       |
| `features/auth/components/`                    | `driver-details-form`, `fleet-signup-form`                                          |
| `features/auth/hooks/`                         | `use-onboarding-form` (rider), `use-fleet-signup-form`, `use-dob-field`, login, OTP |
| `features/registration/registration-steps.ts`  | Pure step rules: order, state, which are done                                       |
| `features/registration/use-registration.ts`    | Requests for documents, status, assigned vehicle                                    |
| `features/registration/next-step.ts`           | Auto-start flag and step-to-step navigation                                         |
| `features/registration/use-auto-start-step.ts` | Opens the first step from a checklist screen                                        |
| `features/registration/screens/`               | One screen per rider step, plus the Documents hub                                   |
| `features/registration/drafts.ts`              | Half-filled steps kept on the phone                                                 |
| `features/fleet/use-fleet-setup.ts`            | Fleet setup checklist and when it is complete                                       |
| `features/fleet/company.ts`                    | Company types and GSTIN rule                                                        |

Rider vehicle and bank steps live in `features/driver/screens/setup-{vehicle,bank}-screen.tsx`.
`/setup-kyc` (from Account and Profile) is **My documents**
(`features/registration/screens/my-documents-screen.tsx`): each document with status, the photos
this phone sent, and its own Update button. Update opens the onboarding screen with `?update=1`,
which unlocks a verified document (after a warning) and returns to the list on save.

## Running and testing

- Metro: `pnpm exec expo start --port 8082`; Android: `adb reverse tcp:8081 tcp:8082`.
- Env: `.env.development` points at the AWS server (`54-252-167-25.sslip.io`); the owner calls it production. CMS: `ryno_cms`, `pnpm dev --port 3000`.
- Test location is Bangalore: `adb emu geo fix 77.5946 12.9716`.
- The Android emulator needs `hw.camera.front=emulated` in the AVD config for the selfie step.
- Sign-up flows need a number with no account; each role needs its own number.
- Checks: `pnpm typecheck && pnpm lint:strict && pnpm format:check`.
