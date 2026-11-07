/** MIME types the backend accepts, keyed by file extension. */
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

/**
 * A React Native FormData file part whose name and type match the file itself.
 * The backend checks the bytes against the declared type, so a PNG from the gallery
 * must not be labelled as a JPEG.
 */
export function filePart(
  uri: string,
  baseName: string,
): { uri: string; name: string; type: string } {
  const extension = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(uri)?.[1]?.toLowerCase() ?? 'jpg';
  const type = MIME_BY_EXTENSION[extension] ?? 'image/jpeg';
  const name = `${baseName}.${type === 'image/jpeg' ? 'jpg' : extension}`;
  return { uri, name, type };
}
