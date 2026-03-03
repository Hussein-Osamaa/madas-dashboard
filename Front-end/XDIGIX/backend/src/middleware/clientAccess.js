/**
 * Ensure user can only access data for their client.
 * - admin: can access any client
 * - staff: can access any client (multi-tenant fulfillment)
 * - client: can ONLY access their own clientId
 */
const restrictToClient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Admin and staff can access all clients
  if (req.user.role === 'admin' || req.user.role === 'staff') {
    return next();
  }

  // Client role must have clientId and can only access their own data
  if (req.user.role === 'client') {
    if (!req.user.clientId) {
      return res.status(403).json({
        success: false,
        message: 'Client account not linked to a brand',
      });
    }
    req.allowedClientId = req.user.clientId;
    return next();
  }

  return res.status(403).json({ success: false, message: 'Access denied' });
};

/**
 * Inject clientId into query for client-role users.
 * Call this after restrictToClient. Use req.allowedClientId set by restrictToClient.
 */
const injectClientFilter = (req, res, next) => {
  if (req.user?.role === 'client' && req.allowedClientId) {
    req.clientFilter = { clientId: req.allowedClientId };
  } else {
    req.clientFilter = {};
  }
  next();
};

module.exports = { restrictToClient, injectClientFilter };
