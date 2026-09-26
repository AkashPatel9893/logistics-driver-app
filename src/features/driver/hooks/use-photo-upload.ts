import { useState } from 'react';

import { getErrorMessage } from '@/lib/api/api-error';
import { uploadsApi, type UploadKind } from '@/lib/api/uploads';
import { capturePhoto, choosePhoto } from '@/lib/photo-capture';

export interface PhotoUpload {
  /** What to show: the uploaded URL, or the local preview while uploading. */
  previewUri: string | null;
  /** Hosted URL once the upload finished; send this to the API. */
  url: string | null;
  uploading: boolean;
  error: string | undefined;
  /** Opens the camera (or library for documents) and uploads the result. */
  pick: () => Promise<void>;
}

/**
 * One photo field: capture → upload → hosted URL. `source: 'document'` lets
 * the driver pick an existing scan; live proof (parcel, selfie) is camera-first.
 */
export function usePhotoUpload(
  kind: UploadKind,
  initialUrl: string | null = null,
  source: 'camera' | 'document' = 'camera',
): PhotoUpload {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const pick = async () => {
    const uri = source === 'document' ? await choosePhoto() : await capturePhoto();
    if (!uri) return;
    setLocalUri(uri);
    setError(undefined);
    setUploading(true);
    try {
      const uploaded = await uploadsApi.uploadPhoto(uri, kind);
      setUrl(uploaded.url);
    } catch (e) {
      setError(getErrorMessage(e));
      setUrl(null);
    } finally {
      setUploading(false);
    }
  };

  return { previewUri: localUri ?? url, url, uploading, error, pick };
}
