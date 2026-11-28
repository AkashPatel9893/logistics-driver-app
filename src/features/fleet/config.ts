/**
 * Fleet owners upload their vehicles' RC, insurance and pollution certificate in the app
 * (`/fleet/vehicles/{id}/documents`, live since 24 November 2026), and a driver can only be assigned
 * once they are verified: without them the driver could never go online anyway.
 */
export const FLEET_VEHICLE_DOCUMENTS_ENABLED = true;
