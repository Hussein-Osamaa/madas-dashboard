const { admin, db } = require('../lib/firebaseAdmin');

/**
 * Validate Firebase ID token and ensure workspace/org scope matches route params.
 */
async function workspaceOrgAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header'
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { workspaceId, orgId } = req.params;

    const tokenWorkspaceId = decoded.workspaceId || decoded.workspace_id || decoded.workspace?.id || null;
    const tokenOrgId = decoded.orgId || decoded.organizationId || decoded.org_id || decoded.organization?.id || null;
    const isSuperAdmin = decoded.superAdmin === true || decoded.role === 'super_admin';

    let hasAccess = isSuperAdmin;

    if (!hasAccess && tokenWorkspaceId === workspaceId && tokenOrgId === orgId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      // Fallback: verify using legacy business/staff collections
      const businessRef = db.collection('businesses').doc(workspaceId);
      const businessSnap = await businessRef.get();

      if (businessSnap.exists) {
        const businessData = businessSnap.data();
        const ownerEmail = businessData.owner?.email;
        const ownerId = businessData.owner?.userId;

        if (
          ownerId === decoded.uid ||
          (ownerEmail && ownerEmail.toLowerCase() === (decoded.email || '').toLowerCase())
        ) {
          hasAccess = true;
        } else {
          const staffDoc = await businessRef.collection('staff').doc(decoded.uid).get();
          if (staffDoc.exists && staffDoc.data().employment?.status !== 'inactive') {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Workspace or organization access denied'
      });
    }

    req.auth = {
      uid: decoded.uid,
      token: decoded
    };
    req.context = {
      workspaceId,
      orgId,
      isSuperAdmin
    };

    return next();
  } catch (error) {
    console.error('workspaceOrgAuth error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
}

module.exports = workspaceOrgAuth;


