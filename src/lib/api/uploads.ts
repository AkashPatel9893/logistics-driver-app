import { request } from './client';
import { filePart } from './file-part';

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

/** The backend's names for each kind (POST /uploads takes the upper-case enum). */
const BACKEND_KIND: Partial<Record<UploadKind, string>> = {
  pickup_photo: 'PICKUP_PHOTO',
  drop_photo: 'DROP_PHOTO',
  daily_check: 'DAILY_CHECK',
  vehicle_rc: 'RC',
  kyc_dl: 'DL',
};

export interface UploadedFile {
  id: string;
  url: string;
  kind: UploadKind;
  createdAt: string;
}

export const uploadsApi = {
  /** Uploads a photo from a local file URI and returns its hosted URL. */
  uploadPhoto: async (localUri: string, kind: UploadKind): Promise<UploadedFile> => {
    // Errors propagate: a photo that didn't reach the server is never shown as saved.
    const form = new FormData();
    form.append('kind', BACKEND_KIND[kind] ?? kind);
    // React Native's FormData accepts { uri, name, type } file parts.
    form.append('file', filePart(localUri, kind) as never);
    return await request<UploadedFile>({
      method: 'POST',
      url: '/uploads',
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
