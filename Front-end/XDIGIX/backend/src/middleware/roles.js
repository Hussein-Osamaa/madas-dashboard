/**
 * Restrict route to specific roles
 * Usage: requireRole('admin') or requireRole(['admin', 'staff'])
 */
const requireRole = (...allowedRoles) => {
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

/**
 * Require a permission (digix-admin). Admin has all permissions; staff must have the permission in user.permissions.
 * Usage: requirePermission('clients:read'), requirePermission('clients:write', 'fulfillment:read')
 */
const requirePermission = (...required) => {
  const perms = Array.isArray(required[0]) ? required[0] : required;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin or staff only.' });
    }
    const userPerms = req.user.permissions || [];
    const hasAll = perms.every((p) => userPerms.includes(p));
    if (!hasAll) {
      return res.status(403).json({
        success: false,
        message: `Missing permission: ${perms.join(' or ')}`,
      });
    }
    next();
  };
};

/**
 * Require permission only for staff; admin and client pass through.
 * Use for routes that client role can hit (e.g. GET /api/clients for own client) but staff need permission.
 */
const requireStaffPermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.role === 'admin' || req.user.role === 'client') return next();
  if (req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const perms = req.user.permissions || [];
  if (!perms.includes(permission)) {
    return res.status(403).json({ success: false, message: `Missing permission: ${permission}` });
  }
  next();
};

/**
 * Admin only
 */
const adminOnly = requireRole('admin');

/**
 * Admin or staff (no clients)
 */
const staffOnly = requireRole('admin', 'staff');

module.exports = { requireRole, requirePermission, requireStaffPermission, adminOnly, staffOnly };
