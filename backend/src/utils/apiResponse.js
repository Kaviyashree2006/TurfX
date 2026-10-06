/**
 * Consistent JSON response envelope (Doc 07).
 * Success:  { success: true,  data: {...}, message: '...' }
 * Error:    { success: false, message: '...', code: 'ERROR_CODE' }
 */

const successResponse = (res, data = {}, message = '', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data, message });
};

const errorResponse = (res, message, statusCode = 400, code = '') => {
  const body = { success: false, message };
  if (code) body.code = code;
  return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };
