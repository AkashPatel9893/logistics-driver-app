import type { UploadedFile, UploadKind } from '@/lib/api/uploads';

import { db } from '../db';
import { body, created, HttpError, randomId, requireUser } from '../http';
import type { Route } from './types';

const KINDS: UploadKind[] = [
  'pickup_photo',
  'drop_photo',
  'daily_check',
  'vehicle_rc',
  'vehicle_front',
  'kyc_dl',
  'kyc_aadhaar',
  'bank_cheque',
];

export const uploadRoutes: Route[] = [
  {
    method: 'POST',
    path: '/uploads',
    handler: (req) => {
      const ownerId = requireUser(req);
      const input = body<{ kind: UploadKind; fileUri: string; mimeType: string }>(req);
      if (!KINDS.includes(input.kind)) {
        throw new HttpError(422, 'INVALID_KIND', 'Unknown upload type.');
      }
      if (!input.fileUri?.startsWith('file://')) {
        throw new HttpError(422, 'INVALID_FILE', 'Attach a photo taken on this device.');
      }
      const file: UploadedFile = {
        id: randomId('upl'),
        url: input.fileUri,
        kind: input.kind,
        createdAt: new Date().toISOString(),
      };
      db.uploads.set(file.id, { ...file, ownerId });
      return created(file, 'Uploaded');
    },
  },
];
