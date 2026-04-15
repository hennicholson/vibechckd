function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

/**
 * Upload a file to Bunny CDN Storage.
 * Returns the public CDN URL for the uploaded file.
 */
export async function uploadToBunny(
  file: Buffer | Uint8Array,
  path: string,
  contentType: string
): Promise<string> {
  const storageKey = getEnv("BUNNY_STORAGE_KEY");
  const storageZone = getEnv("BUNNY_STORAGE_ZONE");
  const storageHost = getEnv("BUNNY_STORAGE_HOST");

  const url = `https://${storageHost}/${storageZone}/${path}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: storageKey,
      "Content-Type": contentType,
    },
    body: new Uint8Array(file),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Bunny CDN upload failed (${response.status}): ${text}`);
  }

  return getCdnUrl(path);
}

/**
 * Delete a file from Bunny CDN Storage.
 */
export async function deleteFromBunny(path: string): Promise<void> {
  const storageKey = getEnv("BUNNY_STORAGE_KEY");
  const storageZone = getEnv("BUNNY_STORAGE_ZONE");
  const storageHost = getEnv("BUNNY_STORAGE_HOST");

  const url = `https://${storageHost}/${storageZone}/${path}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      AccessKey: storageKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Bunny CDN delete failed (${response.status}): ${text}`);
  }
}

/**
 * Get the public CDN URL for a given storage path.
 */
export function getCdnUrl(path: string): string {
  const cdnUrl = process.env.BUNNY_CDN_URL || "https://vibechckd-cdn.b-cdn.net";
  return `${cdnUrl}/${path}`;
}
