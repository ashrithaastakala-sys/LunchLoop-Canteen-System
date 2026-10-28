const AppError = require('../errors/AppError');

function validateCreateOrder(body) {
  const errors = [];

  if (!body) {
    throw AppError.badRequest('Request body is missing', 'EMPTY_BODY');
  }

  const { pickup_window_id, items, notes, idempotency_key } = body;

  if (!pickup_window_id || typeof pickup_window_id !== 'string') {
    errors.push({ field: 'pickup_window_id', message: 'Valid pickup_window_id is required' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field: 'items', message: 'Order must contain at least one item' });
  } else {
    items.forEach((item, index) => {
      if (!item.menu_item_id || typeof item.menu_item_id !== 'string') {
        errors.push({ field: `items[${index}].menu_item_id`, message: 'menu_item_id is required' });
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be a positive integer' });
      } else if (qty > 10) {
        errors.push({ field: `items[${index}].quantity`, message: 'Quantity cannot exceed 10 per item' });
      }
    });
  }

  if (notes && (typeof notes !== 'string' || notes.length > 250)) {
    errors.push({ field: 'notes', message: 'Order notes must be 250 characters or less' });
  }

  if (idempotency_key && (typeof idempotency_key !== 'string' || idempotency_key.length > 100)) {
    errors.push({ field: 'idempotency_key', message: 'Idempotency key must be a string under 100 characters' });
  }

  if (errors.length > 0) {
    throw AppError.badRequest('Validation failed on order creation', 'VALIDATION_ERROR', errors);
  }

  return {
    pickup_window_id,
    items: items.map(i => ({ menu_item_id: i.menu_item_id, quantity: Number(i.quantity) })),
    notes: notes ? notes.trim() : null,
    idempotency_key: idempotency_key ? idempotency_key.trim() : null,
  };
}

function validateCancelOrder(body) {
  const reason = body && body.reason ? String(body.reason).trim() : 'Cancelled by customer';
  if (reason.length > 200) {
    throw AppError.badRequest('Cancellation reason must be 200 characters or less', 'VALIDATION_ERROR');
  }
  return { reason };
}

function validateStatusTransition(body) {
  if (!body || !body.status) {
    throw AppError.badRequest('Target status is required', 'MISSING_STATUS');
  }

  const validStatuses = ['confirmed', 'preparing', 'ready', 'collected', 'cancelled'];
  const status = String(body.status).toLowerCase().trim();

  if (!validStatuses.includes(status)) {
    throw AppError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 'INVALID_STATUS');
  }

  const note = body.note ? String(body.note).trim().substring(0, 200) : null;

  return { status, note };
}

module.exports = {
  validateCreateOrder,
  validateCancelOrder,
  validateStatusTransition,
};
