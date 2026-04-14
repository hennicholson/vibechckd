const BUNNY_STORAGE_KEY = process.env.BUNNY_STORAGE_KEY!;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE!;
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST!;
const BUNNY_CDN_URL = process.env.BUNNY_CDN_URL!;

/**
 * Upload a file to Bunny CDN Storage.
 * Returns the public CDN URL for the uploaded file.
 */
export async function uploadToBunny(
  file: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const url = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: BUNNY_STORAGE_KEY,
      "Content-Type": contentType,
    },
    body: new Uint8Array(file),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Bunny CDN upload failed (${response.status}): ${text}`
    );
  }

  return getCdnUrl(path);
}

/**
 * Delete a file from Bunny CDN Storage.
 */
export async function deleteFromBunny(path: string): Promise<void> {
  const url = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      AccessKey: BUNNY_STORAGE_KEY,
    },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Bunny CDN delete failed (${response.status}): ${text}`
    );
  }
}

/**
 * Get the public CDN URL for a given storage path.
 */
export function getCdnUrl(path: string): string {
  return `${BUNNY_CDN_URL}/${path}`;
}
