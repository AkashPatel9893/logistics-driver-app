import { useState } from 'react';

import { AppImage, type AppImageProps } from '@/components/ui';

import { getVehicleImage } from '../vehicle-images';

export interface VehicleImageProps extends Omit<AppImageProps, 'source'> {
  /** Picture from the backend; may be missing or a broken link. */
  imageUrl?: string | null;
  /** Vehicle type code or name, used to pick the bundled picture. */
  type?: string | null;
}

/** Vehicle picture that falls back to the bundled one for its type when the backend's fails. */
export function VehicleImage({
  imageUrl,
  type,
  contentFit = 'contain',
  ...props
}: VehicleImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = imageUrl && imageUrl !== failedUrl ? imageUrl : null;

  return (
    <AppImage
      {...props}
      contentFit={contentFit}
      source={getVehicleImage(url, type)}
      onError={() => {
        if (url) setFailedUrl(url);
      }}
    />
  );
}
