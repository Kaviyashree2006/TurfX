/**
 * Cloudinary upload/delete service (locked decision #17).
 * - Validates MIME type and file size before forwarding to Cloudinary.
 * - Stores only the secure URL + public_id; no binaries on the TurfX server.
 * - Call sites use uploadTurfImage() and deleteTurfImage() — never import
 *   cloudinary directly in controllers.
 */

const cloudinary = require('../config/cloudinary');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = parseInt(process.env.CLOUDINARY_MAX_FILE_BYTES, 10) || 5 * 1024 * 1024; // 5 MB default

/**
 * Upload a single image buffer to Cloudinary.
 * @param {Buffer} buffer   — raw file buffer (from multer memoryStorage)
 * @param {string} mimetype — e.g. 'image/jpeg'
 * @param {string} folder   — Cloudinary folder, e.g. 'turfx/turfs'
 * @returns {{ url: string, publicId: string }}
 */
const uploadTurfImage = (buffer, mimetype, folder = 'turfx/turfs') => {
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    const err = new Error('Only JPEG, PNG and WebP images are allowed.');
    err.statusCode = 422;
    err.code = 'INVALID_IMAGE_TYPE';
    throw err;
  }
  if (buffer.length > MAX_FILE_BYTES) {
    const err = new Error(`Image must be ${MAX_FILE_BYTES / (1024 * 1024)} MB or smaller.`);
    err.statusCode = 422;
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Use the original format rather than forcing a conversion
        format: mimetype === 'image/webp' ? 'webp' : undefined,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Extract the Cloudinary public_id from a secure URL.
 * Handles URLs like: https://res.cloudinary.com/<cloud>/image/upload/v123/turfx/turfs/abc123.jpg
 */
const publicIdFromUrl = (url) => {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    // Skip version segment if present (v1234567890)
    const afterUpload = parts.slice(uploadIndex + 1);
    const withoutVersion = afterUpload[0]?.match(/^v\d+$/) ? afterUpload.slice(1) : afterUpload;
    const withoutExtension = withoutVersion.join('/').replace(/\.[^/.]+$/, '');
    return withoutExtension;
  } catch {
    return null;
  }
};

/**
 * Delete an image from Cloudinary by its URL.
 * Failure is logged but not thrown — deletion is best-effort.
 */
const deleteTurfImage = async (url) => {
  const publicId = publicIdFromUrl(url);
  if (!publicId) {
    console.warn('[Upload] Could not extract public_id from URL:', url);
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.error('[Upload] Cloudinary delete failed for', publicId, ':', err.message);
  }
};

module.exports = { uploadTurfImage, deleteTurfImage };
