import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/* Image uploads (KYC documents). Files land under public/uploads/<subdir>
   and are served back at /uploads/<subdir>/<name>. Only common image types
   are accepted; anything else is rejected before touching disk. */

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Save a multipart File to disk.
 * @param {File} file  file object from c.req.parseBody()
 * @param {string} subdir  e.g. 'kyc'
 * @returns {Promise<string>} public path, e.g. /uploads/kyc/ab12cd.jpg
 */
export async function saveImage(file, subdir) {
  if (!file || typeof file === 'string' || !file.size) return null;
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new Error('Only JPG, PNG or WebP images are accepted.');
  if (file.size > MAX_BYTES) throw new Error('Images must be under 5 MB.');

  const name = crypto.randomBytes(12).toString('hex') + ext;
  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${subdir}/${name}`;
}
