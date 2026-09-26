import { Directory, File, Paths } from 'expo-file-system';

import { request } from './client';
import { IS_MOCK_API } from './config';

/** What a photo is for — the backend stores and retains each kind differently. */
export type UploadKind =
  | 'pickup_photo'
  | 'drop_photo'
  | 'daily_check'
  | 'vehicle_rc'
  | 'vehicle_front'
  | 'kyc_dl'
  | 'kyc_aadhaar'
  | 'bank_cheque';

export interface UploadedFile {
  id: string;
  url: string;
  kind: UploadKind;
  createdAt: string;
}

/**
 * The mock server has nowhere to put bytes, so the photo is copied into the
 * app's document directory (the picker's temp file can be purged) and that
 * permanent file URI is registered as the upload.
 */
async function persistLocally(uri: string): Promise<string> {
  const dir = new Directory(Paths.document, 'uploads');
  dir.create({ intermediates: true, idempotent: true });
  const source = new File(uri);
  const extension = source.extension || '.jpg';
  const target = new File(
    dir,
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`,
  );
  await source.copy(target);
  return target.uri;
}

export const uploadsApi = {
  /** Uploads a photo from a local file URI and returns its hosted URL. */
  uploadPhoto: async (localUri: string, kind: UploadKind): Promise<UploadedFile> => {
    if (IS_MOCK_API) {
      const storedUri = await persistLocally(localUri);
      return request<UploadedFile>({
        method: 'POST',
        url: '/uploads',
        data: { kind, fileUri: storedUri, mimeType: 'image/jpeg' },
      });
    }
    const form = new FormData();
    form.append('kind', kind);
    // React Native's FormData accepts { uri, name, type } file parts.
    form.append('file', { uri: localUri, name: `${kind}.jpg`, type: 'image/jpeg' } as never);
    return request<UploadedFile>({
      method: 'POST',
      url: '/uploads',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
