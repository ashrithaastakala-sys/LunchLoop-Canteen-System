/**
 * Custom Application Error class with HTTP status code and machine-readable error codes.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = []) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Access forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message, code = 'CONFLICT', details = []) {
    return new AppError(message, 409, code, details);
  }

  static unprocessable(message, code = 'UNPROCESSABLE_ENTITY', details = []) {
    return new AppError(message, 422, code, details);
  }

  static rateLimit(message = 'Too many requests, please slow down', code = 'RATE_LIMITED') {
    return new AppError(message, 429, code);
  }
}

module.exports = AppError;
