const express = require('express');
const { admin, db, getOrganizationRef } = require('../../lib/finance/accounting');

const router = express.Router({ mergeParams: true });

function buildAccountPayload(data, { isUpdate = false, existing = {} } = {}) {
  const payload = {
    accountCode: data.accountCode || existing.accountCode,
    accountName: data.accountName || existing.accountName,
    accountType: data.accountType || existing.accountType,
    accountSubtype: data.accountSubtype ?? existing.accountSubtype ?? null,
    parentAccountId: data.parentAccountId ?? existing.parentAccountId ?? null,
    currency: data.currency || existing.currency || 'USD',
    isActive: data.isActive !== undefined ? data.isActive : (existing.isActive ?? true),
    balance: isUpdate ? existing.balance ?? 0 : Number(data.balance || 0),
    metadata: {
      notes: data.notes || existing.metadata?.notes || '',
      tags: data.tags || existing.metadata?.tags || []
    }
  };

  if (!payload.accountCode || !payload.accountName || !payload.accountType) {
    throw new Error('accountCode, accountName, and accountType are required');
  }

  return payload;
}

router.get('/', async (req, res) => {
  try {
    const { workspaceId, orgId } = req.params;
    const { type, status } = req.query;

    const baseRef = getOrganizationRef(workspaceId, orgId);
    let query = baseRef.collection('accounts');

    if (type) {
      query = query.where('accountType', '==', type);
    }

    if (status === 'inactive') {
      query = query.where('isActive', '==', false);
    } else if (status === 'active') {
      query = query.where('isActive', '!=', false);
    }

    const snapshot = await query.orderBy('accountCode').get();
    const accounts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ accounts });
  } catch (error) {
    console.error('GET accounts error:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts',
      message: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { workspaceId, orgId } = req.params;
    const userId = req.auth?.uid || null;
    const baseRef = getOrganizationRef(workspaceId, orgId);

    const payload = buildAccountPayload(req.body);

    // Ensure account code uniqueness
    const codeSnapshot = await baseRef
      .collection('accounts')
      .where('accountCode', '==', payload.accountCode)
      .limit(1)
      .get();

    if (!codeSnapshot.empty) {
      return res.status(409).json({
        error: 'Account code already exists'
      });
    }

    if (payload.parentAccountId) {
      const parentRef = baseRef.collection('accounts').doc(payload.parentAccountId);
      const parentSnap = await parentRef.get();
      if (!parentSnap.exists) {
        return res.status(400).json({
          error: 'Parent account not found'
        });
      }
    }

    const accountRef = baseRef.collection('accounts').doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const accountData = {
      ...payload,
      accountId: accountRef.id,
      balance: Number(payload.balance || 0),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
      updatedBy: userId,
      workspaceId,
      orgId
    };

    await accountRef.set(accountData);

    res.status(201).json({
      id: accountRef.id,
      ...accountData
    });
  } catch (error) {
    console.error('POST account error:', error);
    res.status(500).json({
      error: 'Failed to create account',
      message: error.message
    });
  }
});

router.get('/:accountId', async (req, res) => {
  try {
    const { workspaceId, orgId, accountId } = req.params;
    const baseRef = getOrganizationRef(workspaceId, orgId);

    const doc = await baseRef.collection('accounts').doc(accountId).get();
    if (!doc.exists) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }

    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('GET account error:', error);
    res.status(500).json({
      error: 'Failed to fetch account',
      message: error.message
    });
  }
});

router.put('/:accountId', async (req, res) => {
  try {
    const { workspaceId, orgId, accountId } = req.params;
    const userId = req.auth?.uid || null;
    const baseRef = getOrganizationRef(workspaceId, orgId);

    const accountRef = baseRef.collection('accounts').doc(accountId);
    const accountSnap = await accountRef.get();

    if (!accountSnap.exists) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }

    const existing = accountSnap.data();
    const payload = buildAccountPayload(req.body, { isUpdate: true, existing });

    if (payload.parentAccountId) {
      const parentRef = baseRef.collection('accounts').doc(payload.parentAccountId);
      const parentSnap = await parentRef.get();
      if (!parentSnap.exists) {
        return res.status(400).json({
          error: 'Parent account not found'
        });
      }
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const updateData = {
      ...payload,
      updatedAt: timestamp,
      updatedBy: userId
    };

    await accountRef.update(updateData);

    res.json({
      id: accountId,
      ...existing,
      ...updateData
    });
  } catch (error) {
    console.error('PUT account error:', error);
    res.status(500).json({
      error: 'Failed to update account',
      message: error.message
    });
  }
});

router.delete('/:accountId', async (req, res) => {
  try {
    const { workspaceId, orgId, accountId } = req.params;
    const userId = req.auth?.uid || null;
    const baseRef = getOrganizationRef(workspaceId, orgId);

    const accountRef = baseRef.collection('accounts').doc(accountId);
    const accountSnap = await accountRef.get();

    if (!accountSnap.exists) {
      return res.status(404).json({
        error: 'Account not found'
      });
    }

    await accountRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: userId
    });

    res.json({
      success: true,
      id: accountId,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('DELETE account error:', error);
    res.status(500).json({
      error: 'Failed to deactivate account',
      message: error.message
    });
  }
});

module.exports = router;



