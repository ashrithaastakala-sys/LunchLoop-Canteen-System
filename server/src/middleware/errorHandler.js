const AppError = require('../errors/AppError');
const { sendError } = require('../utils/response');

/**
 * Maps PostgreSQL / PostgREST custom error codes and messages to HTTP status codes
 */
function mapDatabaseError(err) {
  const msg = err.message || '';
  const details = err.details || '';

  // Custom errors thrown by our RPC functions (004_rpc_atomic_order_and_cancel.sql)
  if (msg.includes('WINDOW_CAPACITY_EXCEEDED') || msg.includes('WINDOW_FULL')) {
    return AppError.conflict(msg.replace(/^.*?:\s*/, ''), 'WINDOW_CAPACITY_EXCEEDED');
  }
  if (msg.includes('INSUFFICIENT_STOCK')) {
    return AppError.conflict(msg.replace(/^.*?:\s*/, ''), 'INSUFFICIENT_STOCK');
  }
  if (msg.includes('ITEM_UNAVAILABLE')) {
    return AppError.conflict(msg.replace(/^.*?:\s*/, ''), 'ITEM_UNAVAILABLE');
  }
  if (msg.includes('CUTOFF_EXCEEDED')) {
    return AppError.conflict(msg.replace(/^.*?:\s*/, ''), 'CUTOFF_EXCEEDED');
  }
  if (msg.includes('CANNOT_CANCEL')) {
    return AppError.conflict(msg.replace(/^.*?:\s*/, ''), 'CANNOT_CANCEL');
  }
  if (msg.includes('INVALID_STATUS_TRANSITION')) {
    return AppError.badRequest(msg.replace(/^.*?:\s*/, ''), 'INVALID_STATUS_TRANSITION');
  }
  if (msg.includes('ORDER_NOT_FOUND') || msg.includes('ITEM_NOT_FOUND') || msg.includes('WINDOW_NOT_FOUND')) {
    return AppError.notFound(msg.replace(/^.*?:\s*/, ''), 'NOT_FOUND');
  }
  if (msg.includes('FORBIDDEN')) {
    return AppError.forbidden(msg.replace(/^.*?:\s*/, ''));
  }
  if (msg.includes('INVALID_QUANTITY') || msg.includes('QUANTITY_LIMIT_EXCEEDED') || msg.includes('ORDER_EMPTY')) {
    return AppError.badRequest(msg.replace(/^.*?:\s*/, ''), 'VALIDATION_ERROR');
  }

  // Postgres unique constraint violation
  if (err.code === '23505') {
    return AppError.conflict('A duplicate record already exists.', 'DUPLICATE_RESOURCE');
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return AppError.badRequest('Referenced entity does not exist.', 'INVALID_FOREIGN_KEY');
  }

  // Postgres check constraint violation
  if (err.code === '23514') {
    return AppError.badRequest('Data integrity violation: value out of allowed range.', 'CHECK_VIOLATION');
  }

  return null;
}

function errorHandler(err, req, res, next) {
  // If already an AppError, send directly
  if (err instanceof AppError) {
    return sendError(res, err);
  }

  // Check for body parser syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, AppError.badRequest('Malformed JSON in request body', 'INVALID_JSON'));
  }

  // Check database/RPC error mapping
  const mappedDbError = mapDatabaseError(err);
  if (mappedDbError) {
    return sendError(res, mappedDbError);
  }

  // Log error internally in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[SERVER_ERROR] [${req.method} ${req.originalUrl}]`, err.message, err.stack);
  }

  // Safe fallback response: never leak internal stack traces
  const isDev = process.env.NODE_ENV === 'development';
  const fallback = new AppError(
    isDev ? err.message : 'An internal server error occurred. Please try again later.',
    500,
    'INTERNAL_SERVER_ERROR',
    isDev && err.stack ? [{ stack: err.stack }] : []
  );

  return sendError(res, fallback);
}

module.exports = errorHandler;
