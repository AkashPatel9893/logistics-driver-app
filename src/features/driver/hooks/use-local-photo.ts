import { useState } from 'react';

import { capturePhoto, choosePhoto } from '@/lib/photo-capture';

export interface LocalPhoto {
  /** Local file URI of the chosen photo; sent to the backend when the form is submitted. */
  uri: string | null;
  pick: () => Promise<void>;
}

/** One photo field whose file is uploaded together with the form, not on selection. */
export function useLocalPhoto(source: 'camera' | 'document' = 'document'): LocalPhoto {
  const [uri, setUri] = useState<string | null>(null);
  const pick = async () => {
    const picked = source === 'document' ? await choosePhoto() : await capturePhoto();
    if (picked) setUri(picked);
  };
  return { uri, pick };
}
