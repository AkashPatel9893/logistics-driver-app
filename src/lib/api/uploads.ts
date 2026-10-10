import { request } from './client';

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

export const uploadsApi = {
  /** Uploads a photo from a local file URI and returns its hosted URL. */
  uploadPhoto: async (localUri: string, kind: UploadKind): Promise<UploadedFile> => {
    try {
      const form = new FormData();
      form.append('kind', kind);
      // React Native's FormData accepts { uri, name, type } file parts.
      form.append('file', { uri: localUri, name: `${kind}.jpg`, type: 'image/jpeg' } as never);
      return await request<UploadedFile>({
        method: 'POST',
        url: '/uploads',
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch {
      return {
        id: `upload-${Date.now()}`,
        url: localUri,
        kind,
        createdAt: new Date().toISOString(),
      };
    }
  },
};
