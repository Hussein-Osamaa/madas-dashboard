const { admin, db, getOrganizationRef, validateJournalEntry, applyBalanceDelta } = require('./accounting');

/**
 * Create or post a journal entry using double-entry bookkeeping.
 * Automatically updates account balances and general ledger summaries.
 */
async function createJournalEntry(workspaceId, orgId, entryData = {}, options = {}) {
  const {
    lineItems = [],
    status = 'posted',
    entryNumber,
    entryDate,
    description = '',
    reference = '',
    referenceType = null,
    attachments = [],
    createdBy,
    postedBy
  } = entryData;

  const { totalDebit, totalCredit } = validateJournalEntry(lineItems);

  const baseRef = getOrganizationRef(workspaceId, orgId);
  const entryRef = baseRef.collection('journal_entries').doc();

  const entryTimestamp = entryDate ? new Date(entryDate) : new Date();
  if (Number.isNaN(entryTimestamp.getTime())) {
    throw new Error('Invalid entryDate provided');
  }

  const month = entryTimestamp.getUTCMonth() + 1;
  const year = entryTimestamp.getUTCFullYear();
  const formattedMonth = String(month).padStart(2, '0');

  const createdAt = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const accountsCache = {};

    // Ensure all accounts exist and collect current balances
    for (const item of lineItems) {
      const accountId = item.accountId;

      if (!accountsCache[accountId]) {
        const accountRef = baseRef.collection('accounts').doc(accountId);
        const accountSnap = await transaction.get(accountRef);

        if (!accountSnap.exists) {
          throw new Error(`Account not found: ${accountId}`);
        }

        const accountData = accountSnap.data();

        if (accountData.isActive === false) {
          throw new Error(`Account ${accountId} is inactive`);
        }

        accountsCache[accountId] = {
          ref: accountRef,
          data: accountData,
          startingBalance: Number(accountData.balance) || 0
        };
      }
    }

    // Update accounts and ledger summaries
    for (const item of lineItems) {
      const {
        accountId,
        debitAmount = 0,
        creditAmount = 0,
        accountName
      } = item;

      const accountCache = accountsCache[accountId];
      const { data: accountData, ref: accountRef } = accountCache;

      const updatedBalance = applyBalanceDelta(
        Number(accountCache.data.balance) || 0,
        accountData.accountType,
        debitAmount,
        creditAmount
      );

      accountCache.data.balance = Number(updatedBalance.toFixed(2));

      transaction.update(accountRef, {
        balance: accountCache.data.balance,
        updatedAt: createdAt,
        updatedBy: createdBy || null
      });

      // General ledger aggregation
      const ledgerId = `${accountId}-${year}-${formattedMonth}`;
      const ledgerRef = baseRef.collection('general_ledger').doc(ledgerId);
      const ledgerSnap = await transaction.get(ledgerRef);

      if (!ledgerSnap.exists) {
        transaction.set(ledgerRef, {
          accountId,
          accountName: accountName || accountData.accountName,
          year,
          month: month,
          openingBalance: Number(accountCache.startingBalance.toFixed(2)),
          totalDebits: Number(debitAmount.toFixed(2)),
          totalCredits: Number(creditAmount.toFixed(2)),
          closingBalance: Number(updatedBalance.toFixed(2)),
          transactionCount: 1,
          currency: accountData.currency || entryData.currency || 'USD',
          lastUpdated: createdAt
        });
      } else {
        const ledgerData = ledgerSnap.data();
        const ledgerClosing = typeof ledgerData.closingBalance === 'number'
          ? ledgerData.closingBalance
          : ledgerData.openingBalance || 0;

        const newClosingBalance = applyBalanceDelta(
          Number(ledgerClosing) || 0,
          accountData.accountType,
          debitAmount,
          creditAmount
        );

        transaction.update(ledgerRef, {
          totalDebits: Number(((ledgerData.totalDebits || 0) + debitAmount).toFixed(2)),
          totalCredits: Number(((ledgerData.totalCredits || 0) + creditAmount).toFixed(2)),
          transactionCount: (ledgerData.transactionCount || 0) + 1,
          closingBalance: Number(newClosingBalance.toFixed(2)),
          lastUpdated: createdAt
        });
      }
    }

    transaction.set(entryRef, {
      entryId: entryRef.id,
      entryNumber: entryNumber || entryRef.id,
      entryDate: admin.firestore.Timestamp.fromDate(entryTimestamp),
      description,
      reference: reference || null,
      referenceType: referenceType || null,
      status,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      lineItems: lineItems.map((item) => ({
        ...item,
        debitAmount: Number((item.debitAmount || 0).toFixed(2)),
        creditAmount: Number((item.creditAmount || 0).toFixed(2))
      })),
      attachments: attachments || [],
      currency: entryData.currency || 'USD',
      createdAt,
      updatedAt: createdAt,
      createdBy: createdBy || null,
      postedAt: status === 'posted' ? createdAt : null,
      postedBy: status === 'posted' ? (postedBy || createdBy || null) : null,
      workspaceId,
      orgId
    });
  }, options.transactionOptions || {});

  const createdEntrySnap = await entryRef.get();
  return {
    id: entryRef.id,
    ...createdEntrySnap.data()
  };
}

module.exports = {
  createJournalEntry
};



