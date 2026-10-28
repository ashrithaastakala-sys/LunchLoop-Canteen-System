const AppError = require('../errors/AppError');

/**
 * Ensures authenticated user has one of the required roles.
 * @param {string[]} allowedRoles - e.g. ['staff', 'admin']
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication is required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireStaff: requireRole(['staff', 'admin']),
  requireAdmin: requireRole(['admin']),
};
