import { useState } from 'react';

import { readDraftPhoto, saveDraftPhoto } from '@/features/registration/drafts';
import { capturePhoto } from '@/lib/photo-capture';

export interface LocalPhoto {
  /** Local file URI of the chosen photo; sent to the backend when the form is submitted. */
  uri: string | null;
  pick: () => Promise<void>;
}

/**
 * One photo field whose file is uploaded together with the form, not on selection.
 * Always the camera: photos can't be picked from the gallery. With a `draftKey` the photo is kept
 * on the phone until the form is submitted, so closing the app mid-step doesn't lose it.
 */
export function useLocalPhoto(draftKey?: string): LocalPhoto {
  const [uri, setUri] = useState<string | null>(() => (draftKey ? readDraftPhoto(draftKey) : null));
  const pick = async () => {
    const picked = await capturePhoto();
    if (!picked) return;
    setUri(draftKey ? await saveDraftPhoto(draftKey, picked) : picked);
  };
  return { uri, pick };
}
