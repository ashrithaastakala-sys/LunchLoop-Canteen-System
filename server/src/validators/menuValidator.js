const AppError = require('../errors/AppError');

function validateCreateMenuItem(body) {
  const errors = [];

  if (!body) throw AppError.badRequest('Request body is missing');

  const { name, category_id, description, price, available_quantity, low_stock_threshold, is_available, is_vegetarian, allergens, prep_time_minutes } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    errors.push({ field: 'price', message: 'Price must be a valid positive number' });
  }

  const numQty = Number(available_quantity ?? 0);
  if (!Number.isInteger(numQty) || numQty < 0) {
    errors.push({ field: 'available_quantity', message: 'Available quantity must be an integer >= 0' });
  }

  const numThreshold = Number(low_stock_threshold ?? 5);
  if (!Number.isInteger(numThreshold) || numThreshold < 0) {
    errors.push({ field: 'low_stock_threshold', message: 'Low stock threshold must be an integer >= 0' });
  }

  if (errors.length > 0) {
    throw AppError.badRequest('Validation failed on menu item creation', 'VALIDATION_ERROR', errors);
  }

  return {
    name: name.trim(),
    category_id: category_id || null,
    description: description ? String(description).trim().substring(0, 500) : null,
    price: Number(numPrice.toFixed(2)),
    available_quantity: numQty,
    low_stock_threshold: numThreshold,
    is_available: is_available !== false,
    is_vegetarian: is_vegetarian !== false,
    allergens: Array.isArray(allergens) ? allergens.map(a => String(a).trim()) : [],
    prep_time_minutes: Number(prep_time_minutes || 5),
  };
}

function validateUpdateStock(body) {
  if (!body || body.quantity === undefined) {
    throw AppError.badRequest('New stock quantity is required', 'MISSING_STOCK');
  }

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw AppError.badRequest('Quantity must be an integer >= 0', 'INVALID_QUANTITY');
  }

  const reason = body.reason ? String(body.reason).trim().substring(0, 150) : 'Manual stock update';
  return { quantity, reason };
}

function validateUpdateAvailability(body) {
  if (!body || typeof body.is_available !== 'boolean') {
    throw AppError.badRequest('is_available must be a boolean (true/false)', 'INVALID_AVAILABILITY');
  }
  return { is_available: body.is_available };
}

module.exports = {
  validateCreateMenuItem,
  validateUpdateStock,
  validateUpdateAvailability,
};
