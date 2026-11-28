# Ryno Partner (driver app)

The app for riders and fleet owners. Expo SDK 58, React Native 0.88, Expo Router, React Query.
This is the one doc for the driver app; update it when a flow changes. What the app still needs
from the backend is in [../BACKEND_TODO.md](../BACKEND_TODO.md). Backend paths below are relative
to `../ryno-logis-fastapi-backend/backend/app`.

## Run and test

- Metro: `pnpm exec expo start --port 8082`; Android: `adb reverse tcp:8081 tcp:8082`.
- Env: `.env.development` points at the AWS server (`54-252-167-25.sslip.io`, API `/api/v1`).
  **Treat it as production.** Live API docs: `https://54-252-167-25.sslip.io/docs`.
- CMS (for approvals): `../ryno_cms`, `pnpm dev --port 3000`.
- Test location is Bangalore: `adb emu geo fix 77.5946 12.9716`.
- The emulator needs `hw.camera.front=emulated` in the AVD config for the selfie step.
  `PK_Android13_API33` has only 2 GB of RAM: cold-boot it before trip tests, then redo
  `adb reverse`.
- Sign-up needs a number with no account; each role needs its own number. Never call
  `/api/v1/dev/otp`; the owner types OTPs and ID numbers.
- Checks: `pnpm typecheck && pnpm lint:strict && pnpm format:check`.

## Code map (`src/`)

| Path                                           | Holds                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/`                                         | Routes only (thin re-exports). `app/(auth)/` is sign-up; its `_layout` guards it    |
| `app/(tabs)/_layout.tsx`                       | Redirects: unapproved rider → Documents, `OwnerSetupGate` → Fleet setup             |
| `lib/api/*.ts`                                 | One file per API area; `client.ts` (axios, tokens), `api-error.ts`, `models.ts`     |
| `hooks/use-*.ts`                               | React Query hooks over `lib/api`                                                    |
| `lib/realtime/`                                | Offer stream and driver socket                                                      |
| `features/auth/onboarding-screen.tsx`          | Shell; picks the form by role                                                       |
| `features/auth/components/`                    | `driver-details-form`, `fleet-signup-form`                                          |
| `features/auth/hooks/`                         | `use-onboarding-form` (rider), `use-fleet-signup-form`, `use-dob-field`, login, OTP |
| `features/registration/registration-steps.ts`  | Pure step rules: order, state, which are done                                       |
| `features/registration/use-registration.ts`    | Requests for documents, status, assigned vehicle                                    |
| `features/registration/next-step.ts`           | Auto-start flag and step-to-step navigation                                         |
| `features/registration/use-auto-start-step.ts` | Opens the first step from a checklist screen                                        |
| `features/registration/screens/`               | One screen per rider step, the Documents hub, My documents                          |
| `features/registration/drafts.ts`              | Half-filled steps kept on the phone                                                 |
| `features/fleet/use-fleet-setup.ts`            | Fleet setup checklist and when it is complete                                       |
| `features/fleet/company.ts`                    | Company types and GSTIN rule                                                        |
| `features/fleet/fleet-members.ts`              | Driver status text; which drivers can be assigned by id                             |
| `features/driver/screens/`                     | Home, trips, wallet, rider vehicle and bank steps                                   |

`/setup-kyc` is **My documents** (`features/registration/screens/my-documents-screen.tsx`): each
document with status, the photos this phone sent, and its own Update button. Update opens the
onboarding screen with `?update=1`, which unlocks a verified document (after a warning) and
returns to the list on save.

## API rules the app relies on

- `Authorization: Bearer <token>`. A 401 refreshes the token, then signs out
  (`ApiError.isUnauthorized`). A wrong OTP is also a 401 (`OTP_INVALID`, `OTP_EXPIRED`,
  `OTP_ATTEMPTS_EXCEEDED`); those are **not** session errors and are skipped.
- Throw `ApiError` for text the partner should see; `getErrorMessage` turns a plain `Error` into
  "Something went wrong".
- Uploads: `POST /uploads`, multipart `kind` and `file` (JPEG); JSON calls take the returned id or
  URL.
- Money moves send an `Idempotency-Key`, saved until the call succeeds or is refused.

## Partner onboarding

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
- Fleet setup has **no vehicle step**; vehicles are added later from the dashboard. Because the
  backend still requires one to submit (`FLEET_VEHICLES`, backend item O1), a fleet owner without a
  vehicle cannot submit a driver application.

### Auto-start (first run only)

Right after sign-up the first pending step opens by itself, and each submit opens the next one.
The checklist shows only when nothing is left, on back, or after an app restart.

- `requestAutoStart()` is called before `setUser()` in both sign-up hooks. The order matters:
  `setUser` makes the auth layout redirect straight away.
- `useAutoStartStep()` (Documents and Fleet setup) shows a plain spinner meanwhile. Sign-up can
  mount the checklist twice; the second copy waits before showing its list.
- The flag lives in memory only, so a restart never auto-opens a step.
- `goToNextStep()` picks the next pending step. For a fleet owner it only walks `photo`,
  `identity`, `bank`, then goes back. For an approved rider it always goes back (an edit from
  Account or My vehicle never opens another step).
- A registered vehicle counts as "vehicle type chosen", even when the light status response (after
  a fresh login) does not name the type.

### What counts as done

|                                        | Rider                               | Fleet owner (to open the dashboard)                                  |
| -------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Step is "done" (skipped by auto-start) | submitted, under review or verified | same                                                                 |
| Unlock                                 | admin approves the application      | company saved; selfie, PAN, Aadhaar **verified**; bank **submitted** |

### Backend rules (`modules/`)

- Submit (`partner_onboarding/service.py`): bank must be `VERIFIED` or `MANUAL_REVIEW`. A fleet
  owner also needs at least one fleet vehicle.
- Agreement: "Accept and submit" first posts `/partner/onboarding/agreement` with the version the
  app hard-codes (`AGREEMENT_VERSION` in `lib/api/onboarding.ts`, must equal the backend's
  `partner_agreement_version`). An old version gets `AGREEMENT_VERSION_MISMATCH`, and the app asks
  the partner to update. There is no agreement text to show yet (backend item O9).
- Approve and go online (`partner_onboarding/eligibility.py`): bank must be `VERIFIED` unless
  `ELIGIBILITY_REQUIRES_VERIFIED_BANK=false`.
- Add fleet vehicle, vehicle documents, assign driver, approve link request
  (`fleet/service.py::_require_owner_kyc`): owner's selfie and PAN `VERIFIED`, else 403
  `FLEET_OWNER_KYC_INCOMPLETE`. No exception for the first vehicle.
- A rider adding their own vehicle has no document check.
- PAN, driving licence and RC go to a verification provider; selfie and Aadhaar go to manual review
  in the CMS.
- After submission the backend lists `locked_fields` (name, birth date). Gender stays editable only
  through `PATCH /partner/profile`; `PUT` is refused.

### Errors the partner sees

- A refused document shows the backend's `rejection_reason` through `lib/api/rejection-reason.ts`:
  provider codes are translated, reviewer text is kept, unknown codes fall back to a general
  message.
- **Can't go online:** an approved partner sees the backend's own reasons
  (`GET /partner/eligibility`, or the `DRIVER_NOT_ELIGIBLE` refusal) in plain words through
  `lib/api/eligibility-reason.ts`, on Home and its card: a document missing, expired or not
  verified (on a fleet vehicle: "your fleet owner looks after its papers"), bank not verified,
  vehicle waiting for approval, owner's permission, suspended. Unknown codes give one general line.
  Before approval Home keeps the checklist steps and the application status.
- A refused bank account has no reason from the backend (item O3). The bank screen stays open and
  says it could not be verified. Documents says "Ready to submit" until the rider submits.

## One main place per detail

Don't repeat a partner's details across screens, and keep rider and fleet-owner items apart.

| Detail                                         | Main place                                             |
| ---------------------------------------------- | ------------------------------------------------------ |
| Rider's photo, name, birth date, phone, gender | My profile (`/my-profile`), from the Account name card |
| Owner's company and fleet                      | Profile (owners only)                                  |
| Licence, PAN, Aadhaar (and an owner's photo)   | My documents (`/setup-kyc`)                            |
| Rider's vehicle and its papers                 | My vehicle (`/setup-vehicle`), own Account row         |
| Bank account                                   | Bank details                                           |
| Balance, payouts, history                      | Wallet (Earnings has no wallet tab)                    |

- Account menu rows carry no numbers, only "Needs attention". Ratings show only once there is one.
- Home keeps first name and current vehicle; the ID card shows its details together on purpose.
  "Partner since" is hidden: the profile has no `created_at` (backend item 72).

### Owner mode

- No "Add Vehicle" row on Account; adding is on the fleet screens (one button while empty).
- The Account name card is information only; My Fleet & Vehicles opens the fleet profile.
- The side menu leaves out Rewards, My trips and Refer friends.
- The Ryno ID card shows to an owner only once approved to drive (`showsDriverId`).
- The owner's Home shows the fleet vehicle section only; there is no driver checklist.
- Log out (Account and Documents) also ends the session on the server (`POST /auth/logout`, sent
  in the background with a 5 s limit; `logOut()` in `use-auth-store`). A session the server
  already refused only clears the phone (`signOut()`).
- Logout forgets the saved dashboard role. A login without `selected_role` gets the account's own
  saved mode from the backend; sending another account's choice would overwrite it.
- Fleet setup redirects to the dashboard only while its list is focused.

## Fleet vehicles and drivers

- One driver per vehicle, one vehicle per driver. Putting a driver (or the owner) on a second
  vehicle moves them; the app asks first when it can see where they are.
- A driver added by name and phone is only **invited** (`driver.invite_id`) until they sign in.
  Drop an invite with `DELETE /fleet/drivers/{invite_id}`; unassign
  (`DELETE /fleet/vehicles/{id}/drivers`) does not remove it (backend item O5).
- Joined driver: Unassign keeps them in the fleet; Remove from fleet is
  `DELETE /fleet/drivers/{driver_id}`.
- **Drivers** (`/fleet-drivers`: owner's Account row, and a Home banner while a request waits)
  lists `GET /fleet/drivers` without the owner, and pending join requests (approve or decline).
- A number that already has a Ryno account cannot be invited (`DRIVER_ALREADY_REGISTERED`). That
  driver sends a join request: during sign-up ("I drive for a fleet owner") or later from My
  vehicle. The owner approves it, then assigns a vehicle by `driver_id` (the backend refuses their
  name and number). Add driver lists them under "Already in your fleet".
- `GET /partner/vehicles` also returns ended assignments; read it through
  `onboardingApi.listVehicles`, which keeps `PENDING` and `ACTIVE` only.
- The vehicle in use is the profile's `active_vehicle`, named only once approved. A fleet
  assignment stays `PENDING` until an admin approves it (blocked: backend item O7). My vehicle
  lists **Other vehicles**: an approved one has "Use this vehicle" (`POST /partner/active-vehicle`,
  refused while online or on a trip); a pending one says so.
- A fleet vehicle is read-only for the rider: no update form, and no join button while in a fleet.
- A rider's own vehicle number is read-only once saved (backend item O8); it stays editable only
  while the saved vehicle is refused.
- Edit (vehicle card and Vehicle Details) changes make, model and fuel type only, through
  `PATCH /fleet/vehicles/{id}` with only what changed. Once the RC is verified the backend locks
  them (`VEHICLE_DETAILS_LOCKED`) and Edit is hidden.
- **Vehicle papers (owner):** Vehicle details uploads RC, insurance and (unless electric) pollution
  certificate through `/fleet/vehicles/{id}/documents` (`FLEET_VEHICLE_DOCUMENTS_ENABLED` in
  `features/fleet/config.ts`). Until they are verified the vehicle shows "Verify this vehicle first"
  instead of Add driver: without them its driver can never go online.
- **Other papers:** a fitness certificate and a state or national permit
  (`driver/components/other-vehicle-papers.tsx`), on Vehicle details and on a rider's My vehicle.
  A row shows when the vehicle needs one or already has one. Rider: the onboarding checklist
  names them (by type, or fitness for a vehicle over 15 years). Owner: the vehicle type's
  `requires_fitness_certificate` / `requires_commercial_permit`, so a fleet vehicle that needs
  fitness only for its age shows no row until one is uploaded; its driver sees the reason instead.
  No live type needs either on 28 November.
- The last vehicle cannot be removed while another driver or invite is on it
  (`LAST_VEHICLE_HAS_DRIVERS`). A removed vehicle can be added again.

### A vehicle someone else owns

For a rider's own vehicle whose number is not yet locked, My vehicle asks "Who owns this
vehicle?". "Someone else" asks for a person or business, their name and mobile, and saves with
`POST /partner/vehicles`, `is_owner: false` and `owner {owner_type, first_name, last_name |
business_name, phone}`. The backend then needs the owner's permission (`OWNER_AUTHORIZATION`): the
app opens **Owner's permission** (`/owner-permission`), which uploads a photo of the signed NOC
letter (`…/owner-authorization/noc`, multipart `file`) and checks a code texted to the owner
(`…/otp/request`, `…/otp/verify {code}`). Until both are done the vehicle step reads "Owner's
permission needed".

- Errors: `OWNER_PHONE_IS_DRIVER` (the rider's own number), `VEHICLE_OWNER_MISMATCH`, and the OTP
  codes above with their own messages.
- After a successful check the app writes `owner_authorization` into the cached vehicles, then
  refreshes vehicles, onboarding status and profile.

## Money and trips

- **Rider wallet:** payouts with `POST /partner/payouts` (`Idempotency-Key`). Wallet reads
  `GET /partner/payouts/limits` (`minimum_amount`, `transfers_left`, `transfers_per_week`,
  `renews_at`, each null when unset) and shows only the limits that are set. The server answers
  422 `BELOW_MINIMUM_WITHDRAWAL` or 409 `PAYOUT_LIMIT_REACHED`; on the latter the app drops the
  saved key, since nothing was paid. Server on 27 November: minimum ₹100, unlimited transfers.
- **Fleet wallet (owner mode):** `GET /fleet/wallet`, `/fleet/wallet/transactions`,
  `GET/POST /fleet/payouts` (`useWallet('fleet')`, its own saved key). Trips in the fleet's
  vehicles, the owner's own driving included, are paid there; money goes to the owner's verified
  bank. At or below `minimum_balance` none of the fleet's drivers get offers, and the screen says
  so. Top-up is not built (the server's instant top-up is dev only).
- **Trips:** Completed reads `GET /partner/earnings`; Cancelled and Missed read
  `GET /partner/trips?status=CANCELLED|MISSED&from=&to=` (up to 3 pages of 100) for the selected
  day, week or month. Cancelled also lists failed deliveries; Missed rows are declined or expired
  offers. These cards open no details screen.
- **Delivery complete** lists the trip's real wallet entries from `GET /wallet/orders/{id}`.
- **Safety:** SOS (Help screen, during a trip only) is `POST /partner/safety/sos` with the latest
  position. Report a problem (Trip details and the active trip) is `POST /partner/safety/incidents`
  with `{order_id, type: ACCIDENT | RUDE_BEHAVIOUR | OTHER, description (10–2000 chars)}`; the app
  shows the incident number. Errors: `ORDER_NOT_FOUND`, `VALIDATION_ERROR`, `SAFETY_RATE_LIMITED`.
  Report status is not shown yet.

## Test record

Android emulator, Bangalore, AWS server. Test accounts: fleet `9000045871` (`QA Fleet Test`),
rider `9000045872` (`QA Test Rider`, scooter `KA01QA4567`). Approvals use reason `QA_TEST`.
Temporary vehicles were removed after each run.

- **Passed (26–27 November):** rider and fleet sign-up, auto-advance, no list flash after rider
  sign-up, fleet list after back and restart, under-18 rejection, CMS document review, rider
  approval, approved rider opening Home after restart; fleet add (with driver prompt), validation,
  drive myself, move warning, invite, move invite, cancel invite, stop driving, remove, add again,
  last-vehicle refusal; join request from My vehicle, Home banner, approve, assign, unassign,
  assign by typed number, remove from fleet, refused registered number; vehicle edit kept by the
  server; empty-fleet Home; pending fleet vehicle under Other vehicles.
- **Owner's permission (27 November):** checked on the emulator with stubbed calls only (letter
  photo, send code, wrong code, right code, Continue).

## Open work

- **Not tested:** declining a join request; switching vehicles; the read-only fleet vehicle;
  sending a vehicle paper (RC, insurance, PUC, fitness, permit: turned on 28 November, sheet and
  validation checked on the emulator without sending); the "can't go online" reasons on a real
  blocked account; Log out ending the server session; the vehicle form's owner question and any real
  owner-permission call (needs a new vehicle and an owner phone we control); iOS.
- **Re-run end to end:** fleet popup → dashboard, role not carried after logout, refused-bank
  message, "Ready to submit" banner, document rejection reasons, bank save as an approved rider
  after a fresh login (fixed 27 November by checking `goToNextStep`, screen not re-run).
- "Go to Home" after approval once seemed to stay on Documents. The button now clears the stack
  first; other `replace('/home')` calls may stack copies of the tabs and were not checked.
- **Fixed 28 November (tried with real orders on the emulator):** a new offer now opens from any
  tab or screen, not only Home (it was silently "Missed" on Trips). The ring lives in the tabs
  layout's `DriverSession`, with one app-wide "already opened" list, because two stacked copies of
  the tabs each opened the same offer (two offer screens; Ignore left a dead "no longer
  available" page). Delivery complete no longer repeats the cash line.
- Possible bug: a deep link on cold start (not reproduced yet).
- Login keyboard nearly covers Continue. The fleet vehicle form says "you'll use for deliveries".
- **Not yet seen on a device (fixed 7 November):** accept recovery when the accept response is
  lost; a stalled offer stream (after 35 s with no data the app polls every 4 s and reconnects);
  trip lookup after a failed location report.
- **Waiting on backend:**
  - Multi-stop cash collection (backend item 3): route the final stop to payment, restore a
    pending collection after restart, show "Delivery complete" only after settlement.
  - Show `fare_breakdown` on Collect payment (already returned by the backend).
  - Waiting bar: falls back to 10 free minutes when `free_waiting_until` is null, until product
    says what null means.
  - Payment QR is from a mock payee; keep cash as the main path (item 21).
  - Push token after login (item 73). Firebase is wired (`google-services.json` in the app root);
    the app has not been rebuilt or tried on a device.
- **From product (MOM):** "Ignore ride" without a reason; several incoming offers at once; move
  "Cancel trip" to the bottom of the active delivery screen; new cancellation reasons (item 22).
- **GPS cadence:** every 20 s when moving (over 5 km/h), every 3 minutes when waiting (under 2 km/h
  for over a minute, or at a stop), back to 20 s at once when moving again.
- **OTP input:** one digit was once lost on fast entry; reproduce typing and paste on iOS and
  Android for login, pickup and each stop.
- **Daily vehicle check:** design asks for a photo in uniform with the package; the app asks for a
  selfie with the vehicle. Align with operations.
- **Waiting on product decisions:** cargo details, proof-of-delivery photos, delivery-exception
  actions.
