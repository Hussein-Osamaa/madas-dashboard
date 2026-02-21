/**
 * Shared accounting helpers used across finance modules.
 */

const { admin, db } = require('../firebaseAdmin');

const NORMAL_BALANCE = {
  asset: 'debit',
  liability: 'credit',
  equity: 'credit',
  revenue: 'credit',
  expense: 'debit'
};

/**
 * Return the normal balance side for an account type.
 */
function getNormalBalance(accountType) {
  const normalized = accountType ? accountType.toLowerCase() : '';
  return NORMAL_BALANCE[normalized] || 'debit';
}

/**
 * Apply debit/credit amounts to a running balance using the account's normal side.
 */
function applyBalanceDelta(currentBalance, accountType, debitAmount = 0, creditAmount = 0) {
  const normalSide = getNormalBalance(accountType);
  const debit = Number(debitAmount) || 0;
  const credit = Number(creditAmount) || 0;

  if (normalSide === 'debit') {
    return currentBalance + debit - credit;
  }

  return currentBalance - debit + credit;
}

/**
 * Calculate the balance of an account based on its transactions.
 */
function calculateAccountBalance(accountType, openingBalance, transactions = []) {
  let runningBalance = Number(openingBalance) || 0;

  transactions.forEach((transaction) => {
    const { debitAmount = 0, creditAmount = 0 } = transaction || {};
    runningBalance = applyBalanceDelta(runningBalance, accountType, debitAmount, creditAmount);
  });

  return runningBalance;
}

/**
 * Basic validation for journal entry line items.
 * Ensures debits equal credits and required fields are present.
 */
function validateJournalEntry(lineItems = []) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error('Journal entry must include at least one line item');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  lineItems.forEach((item, index) => {
    if (!item || !item.accountId) {
      throw new Error(`Line item ${index + 1} is missing accountId`);
    }

    const debit = Number(item.debitAmount) || 0;
    const credit = Number(item.creditAmount) || 0;

    if (debit < 0 || credit < 0) {
      throw new Error('Debit and credit amounts must be zero or positive');
    }

    if (debit === 0 && credit === 0) {
      throw new Error(`Line item ${index + 1} must have either a debit or credit amount`);
    }

    if (debit > 0 && credit > 0) {
      throw new Error(`Line item ${index + 1} cannot have both debit and credit values`);
    }

    totalDebit += debit;
    totalCredit += credit;
  });

  if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
    throw new Error('Total debits must equal total credits');
  }

  return {
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2))
  };
}

/**
 * Ensure an account document exists and is active.
 */
async function assertAccountIsActive(baseRef, accountId, transaction) {
  const accountRef = baseRef.collection('accounts').doc(accountId);
  const accountSnap = await transaction.get(accountRef);

  if (!accountSnap.exists) {
    throw new Error(`Account not found: ${accountId}`);
  }

  const accountData = accountSnap.data();
  if (accountData.isActive === false) {
    throw new Error(`Account ${accountId} is inactive`);
  }

  return { accountRef, accountData };
}

/**
 * Utility: Build scoped organization reference.
 */
function getOrganizationRef(workspaceId, orgId) {
  if (!workspaceId || !orgId) {
    throw new Error('workspaceId and orgId are required');
  }

  return db
    .collection('workspaces')
    .doc(workspaceId)
    .collection('organizations')
    .doc(orgId);
}

module.exports = {
  admin,
  db,
  getNormalBalance,
  applyBalanceDelta,
  calculateAccountBalance,
  validateJournalEntry,
  assertAccountIsActive,
  getOrganizationRef
};



