/**
 * settings.service.js
 * Reads the single Settings document from the DB.
 * Cached briefly (60s) so every booking/cancellation doesn't hit the DB.
 * Admin updates invalidate the cache via clearCache().
 */
const Settings = require('../models/Settings');

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

const getSettings = async () => {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL_MS) return _cache;

  let settings = await Settings.findOne();
  if (!settings) {
    // Seed the single Settings document on first access
    settings = await Settings.create({});
  }
  _cache = settings;
  _cacheTime = now;
  return settings;
};

const clearCache = () => {
  _cache = null;
  _cacheTime = 0;
};

module.exports = { getSettings, clearCache };
