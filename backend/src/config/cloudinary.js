const cloudinary = require('cloudinary').v2;

// Initialise Cloudinary SDK once from env vars (locked decision #17).
// All image operations go through this instance.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
