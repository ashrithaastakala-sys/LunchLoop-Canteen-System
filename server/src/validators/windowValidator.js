const AppError = require('../errors/AppError');

function validatePickupWindow(body) {
  const errors = [];
  if (!body) throw AppError.badRequest('Request body is missing');

  const { starts_at, ends_at, capacity, is_active } = body;

  const start = new Date(starts_at);
  const end = new Date(ends_at);

  if (isNaN(start.getTime())) {
    errors.push({ field: 'starts_at', message: 'Valid starts_at ISO timestamp is required' });
  }

  if (isNaN(end.getTime())) {
    errors.push({ field: 'ends_at', message: 'Valid ends_at ISO timestamp is required' });
  }

  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
    errors.push({ field: 'ends_at', message: 'Pickup window ends_at must be strictly after starts_at' });
  }

  const numCap = Number(capacity);
  if (!Number.isInteger(numCap) || numCap <= 0) {
    errors.push({ field: 'capacity', message: 'Capacity must be a positive integer > 0' });
  }

  if (errors.length > 0) {
    throw AppError.badRequest('Validation failed for pickup window', 'VALIDATION_ERROR', errors);
  }

  return {
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    capacity: numCap,
    is_active: is_active !== false,
  };
}

module.exports = {
  validatePickupWindow,
};
