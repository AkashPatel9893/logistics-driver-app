/**
 * Fleet owners upload their vehicles' RC, insurance and pollution certificate in the app, and a driver can only
 * be assigned once they are verified. Needs the backend changes in change-report/backend-request-fleet-owner-and-
 * profile.md (section "Fleet vehicle documents"). Turn on once they are live; until then the app behaves as before:
 * documents are read-only and a driver can be assigned straight away.
 */
export const FLEET_VEHICLE_DOCUMENTS_ENABLED = false;
