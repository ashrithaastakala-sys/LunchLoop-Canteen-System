/**
 * Standard API response envelope helpers
 */
function sendSuccess(res, data = {}, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  const responsePayload = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected server error occurred',
      details: error.details || [],
    },
  };

  return res.status(statusCode).json(responsePayload);
}

module.exports = {
  sendSuccess,
  sendError,
};
