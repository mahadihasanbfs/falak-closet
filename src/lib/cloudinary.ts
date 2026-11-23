/**
 * cloudinary.ts — Media upload and management helpers.
 *
 * Uploads are stored directly in the database (via POST /api/upload -> MongoDB)
 * and served at `/api/images/[id]` without requiring third-party Cloudinary services.
 * Cloudinary helpers remain for backwards compatibility with any existing delivery URLs.
 */

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

/**
 * Upload one or many images via POST /api/upload directly to the database.
 * Uploads are sequential so `onProgress` stays meaningful; typical batches are
 * small (a handful of product photos) so parallelism isn't worth the complexity.
 */
export async function uploadImages(
  input: File | File[],
  folder?: string,
  onProgress?: (done: number, total: number) => void
): Promise<UploadedImage[]> {
  const files = Array.isArray(input) ? input : [input];
  if (files.length === 0) return [];

  const results: UploadedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const form = new FormData();
    form.append('file', files[i]);
    if (folder) form.append('folder', folder);

    let res: Response;
    try {
      res = await fetch('/api/upload', { method: 'POST', body: form });
    } catch {
      throw new Error('Upload failed — check your connection and try again.');
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
    }

    const list = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.uploaded)
      ? data.uploaded
      : [];

    for (const r of list) {
      results.push({
        url: r.secureUrl || r.url,
        publicId: r.publicId,
        ...(typeof r.width === 'number' ? { width: r.width } : {}),
        ...(typeof r.height === 'number' ? { height: r.height } : {}),
      });
    }
    onProgress?.(i + 1, files.length);
  }

  return results;
}

/** Best-effort asset cleanup (database image or legacy Cloudinary) — never throws, never blocks UI. */
export async function deleteCloudinaryImage(publicIdOrUrl: string): Promise<boolean> {
  try {
    const res = await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: publicIdOrUrl }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[deleteCloudinaryImage] failed:', publicIdOrUrl, err);
    return false;
  }
}

/** Alias for deleteCloudinaryImage */
export const deleteStoredImage = deleteCloudinaryImage;

/** True for Cloudinary delivery URLs (https://res.cloudinary.com/...). */
export function isCloudinaryUrl(src: string): boolean {
  return typeof src === 'string' && src.includes('res.cloudinary.com');
}

/**
 * Parse the public id or database ID out of an image URL.
 * E.g.:
 *  `/api/images/65fa1234567890abcdef1234` → `65fa1234567890abcdef1234`
 *  `.../image/upload/v1712345678/falak-closet/products/abc.jpg` → `falak-closet/products/abc`
 */
export function cloudinaryPublicIdFromUrl(url: string): string | null {
  if (typeof url !== 'string' || !url) return null;

  // Check if it's a database-backed image
  const dbMatch = url.match(/\/api\/images\/([a-f\d]{24})/i);
  if (dbMatch) return dbMatch[1];
  if (/^[a-f\d]{24}$/i.test(url.trim())) return url.trim();

  // Legacy Cloudinary URLs
  if (!isCloudinaryUrl(url)) return null;

  try {
    const { pathname } = new URL(url);
    const marker = '/image/upload/';
    const idx = pathname.indexOf(marker);
    if (idx === -1) return null;

    let rest = pathname.slice(idx + marker.length);
    // Drop a leading version segment (v1712345678) if present.
    if (/^v\d+\//.test(rest)) rest = rest.replace(/^v\d+\//, '');
    // Drop the extension — public ids never include it.
    const dot = rest.lastIndexOf('.');
    if (dot > -1) rest = rest.slice(0, dot);

    return rest || null;
  } catch {
    return null;
  }
}

/** Alias for cloudinaryPublicIdFromUrl */
export const getImageIdFromUrl = cloudinaryPublicIdFromUrl;

/**
 * Inject f_auto,q_auto (+ optional w/h/c_fill) into an existing Cloudinary URL
 * right after `/upload/`. Non-Cloudinary URLs pass through untouched, so this
 * is safe to call on any stored image src.
 */
export function cloudinaryThumb(url: string, w: number, h?: number): string {
  if (!isCloudinaryUrl(url)) return url;

  const transforms = [
    'f_auto',
    'q_auto',
    `w_${w}`,
    ...(h ? [`h_${h}`, 'c_fill'] : []),
  ].join(',');

  return url.replace(/\/upload\/(?:v\d+\/)?/, `/upload/${transforms}/`);
}
