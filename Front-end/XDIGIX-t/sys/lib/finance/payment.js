const { admin, db, getOrganizationRef } = require('./accounting');
const { createJournalEntry } = require('./journalEntry');

const SOURCE_COLLECTION_MAP = {
  invoice: 'invoices',
  bill: 'bills'
};

async function recordPayment({
  workspaceId,
  orgId,
  paymentData = {},
  journalEntryData = null
}) {
  if (!workspaceId || !orgId) {
    throw new Error('workspaceId and orgId are required');
  }

  const {
    paymentNumber,
    paymentType = 'received',
    paymentDate,
    amount,
    sourceType,
    sourceId,
    sourceNumber,
    partyType,
    partyId,
    partyName,
    paymentMethod,
    reference,
    bankAccountId,
    status = 'completed',
    notes = '',
    attachments = [],
    createdBy = null
  } = paymentData;

  if (!amount || Number(amount) <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const baseRef = getOrganizationRef(workspaceId, orgId);
  const paymentRef = baseRef.collection('payments').doc();
  const paymentId = paymentRef.id;

  let sourceUpdateResult = null;

  await db.runTransaction(async (transaction) => {
    const paymentTimestamp = paymentDate
      ? admin.firestore.Timestamp.fromDate(new Date(paymentDate))
      : admin.firestore.Timestamp.now();

    const paymentPayload = {
      paymentId,
      paymentNumber: paymentNumber || `PAY-${new Date().getFullYear()}-${paymentId.slice(-6)}`,
      paymentType,
      paymentDate: paymentTimestamp,
      amount: Number(Number(amount).toFixed(2)),
      sourceType: sourceType || null,
      sourceId: sourceId || null,
      sourceNumber: sourceNumber || null,
      partyType: partyType || null,
      partyId: partyId || null,
      partyName: partyName || '',
      paymentMethod: paymentMethod || 'other',
      reference: reference || '',
      bankAccountId: bankAccountId || null,
      status,
      notes,
      attachments,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy,
      updatedBy: createdBy,
      journalEntryId: null,
      workspaceId,
      orgId
    };

    transaction.set(paymentRef, paymentPayload);

    if (sourceType && SOURCE_COLLECTION_MAP[sourceType] && sourceId) {
      const collectionName = SOURCE_COLLECTION_MAP[sourceType];
      const sourceRef = baseRef.collection(collectionName).doc(sourceId);
      const sourceSnap = await transaction.get(sourceRef);

      if (!sourceSnap.exists) {
        throw new Error(`${sourceType} not found: ${sourceId}`);
      }

      const sourceData = sourceSnap.data();
      const existingPaid = Number(sourceData.paidAmount) || 0;
      const totalAmount = Number(sourceData.totalAmount) || 0;
      const newPaidAmount = Number((existingPaid + Number(amount)).toFixed(2));
      const newBalance = Number((totalAmount - newPaidAmount).toFixed(2));

      let newStatus = sourceData.status || 'unpaid';
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partially_paid';
      }

      const updatedPayments = [
        ...(sourceData.payments || []),
        {
          paymentId,
          amount: Number(Number(amount).toFixed(2)),
          paymentDate: paymentTimestamp,
          paymentMethod: paymentMethod || 'other',
          reference: reference || '',
          recordedBy: createdBy
        }
      ];

      transaction.update(sourceRef, {
        paidAmount: newPaidAmount,
        balanceAmount: Math.max(newBalance, 0),
        status: newStatus,
        payments: updatedPayments,
        updatedAt: timestamp,
        updatedBy: createdBy
      });

      sourceUpdateResult = {
        collectionName,
        documentId: sourceId,
        newStatus,
        newPaidAmount,
        newBalance
      };
    }
  });

  let journalEntryId = null;
  if (journalEntryData) {
    const entry = await createJournalEntry(workspaceId, orgId, {
      ...journalEntryData,
      entryDate: journalEntryData.entryDate || paymentData.paymentDate || new Date().toISOString(),
      reference: journalEntryData.reference || sourceNumber || paymentData.paymentNumber,
      referenceType: journalEntryData.referenceType || sourceType || 'payment',
      description: journalEntryData.description || `Payment ${paymentData.paymentNumber || paymentId}`
    });

    journalEntryId = entry.id;
    await paymentRef.update({
      journalEntryId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: journalEntryData.createdBy || createdBy || null
    });
  }

  const paymentSnapshot = await paymentRef.get();

  return {
    id: paymentId,
    ...paymentSnapshot.data(),
    journalEntryId,
    sourceUpdate: sourceUpdateResult
  };
}

module.exports = {
  recordPayment
};



