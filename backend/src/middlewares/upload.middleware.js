/**
 * Multer middleware for turf image uploads.
 * Uses memoryStorage — files never touch the server disk.
 * Actual MIME + size validation is done in upload.service.js before forwarding
 * to Cloudinary; multer here just parses the multipart/form-data request.
 */
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.CLOUDINARY_MAX_FILE_BYTES, 10) || 5 * 1024 * 1024, // 5 MB
    files: 8, // max 8 images per upload request
  },
});

module.exports = upload;
