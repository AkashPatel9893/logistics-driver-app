import { Share } from 'react-native';

/**
 * Lets the owner tell an invited driver themselves (WhatsApp, SMS, any app). The backend records
 * the invite but sends no SMS yet, so without this the driver may never hear about it.
 */
export function shareFleetInvite({
  driverName,
  phone,
  companyName,
  plate,
}: {
  driverName: string;
  phone: string;
  companyName?: string | null;
  plate?: string | null;
}) {
  const fleet = companyName?.trim() || 'My fleet';
  const digits = phone.replace(/\D/g, '').slice(-10);
  const vehicle = plate ? ` to drive ${plate}` : '';
  const message =
    `Hi ${driverName.trim() || 'there'}, ${fleet} has added you as a driver on Ryno${vehicle}. ` +
    `Install the Ryno Partner app and sign in with +91 ${digits} to join.`;
  void Share.share({ message });
}
