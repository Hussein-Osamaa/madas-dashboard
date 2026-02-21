const { admin, getOrganizationRef, getNormalBalance } = require('./accounting');

/**
 * Build a categorized list of accounts for the balance sheet.
 */
async function generateBalanceSheet(workspaceId, orgId, asOfDate = new Date()) {
  if (!workspaceId || !orgId) {
    throw new Error('workspaceId and orgId are required');
  }

  const baseRef = getOrganizationRef(workspaceId, orgId);
  const accountsSnapshot = await baseRef.collection('accounts').get();

  const categories = {
    assets: [],
    liabilities: [],
    equity: []
  };

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  accountsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.isActive === false) {
      return;
    }

    const account = {
      id: doc.id,
      accountCode: data.accountCode,
      accountName: data.accountName,
      balance: Number((data.balance || 0).toFixed(2)),
      currency: data.currency || 'USD',
      accountType: data.accountType,
      accountSubtype: data.accountSubtype || null
    };

    if (data.accountType === 'asset') {
      categories.assets.push(account);
      totalAssets += account.balance;
    } else if (data.accountType === 'liability') {
      categories.liabilities.push(account);
      totalLiabilities += account.balance;
    } else if (data.accountType === 'equity') {
      categories.equity.push(account);
      totalEquity += account.balance;
    }
  });

  // Retained earnings approximation: assets - liabilities - other equity
  const retainedEarnings = Number((totalAssets - totalLiabilities - totalEquity).toFixed(2));

  if (categories.equity.length > 0) {
    categories.equity.push({
      id: 'retained_earnings',
      accountCode: '3300',
      accountName: 'Retained Earnings',
      balance: retainedEarnings,
      currency: 'USD',
      accountType: 'equity',
      accountSubtype: 'retained_earnings'
    });
    totalEquity += retainedEarnings;
  }

  return {
    asOfDate: asOfDate instanceof Date ? asOfDate.toISOString() : new Date(asOfDate).toISOString(),
    categories,
    totals: {
      assets: Number(totalAssets.toFixed(2)),
      liabilities: Number(totalLiabilities.toFixed(2)),
      equity: Number(totalEquity.toFixed(2))
    },
    isBalanced: Number(totalAssets.toFixed(2)) === Number((totalLiabilities + totalEquity).toFixed(2))
  };
}

/**
 * Generate an income statement from journal entries within a period.
 */
async function generateIncomeStatement(workspaceId, orgId, startDate, endDate) {
  if (!workspaceId || !orgId) {
    throw new Error('workspaceId and orgId are required');
  }

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date range supplied');
  }

  const baseRef = getOrganizationRef(workspaceId, orgId);
  const accountsSnapshot = await baseRef.collection('accounts').get();

  const accountMap = new Map();
  accountsSnapshot.forEach((doc) => {
    accountMap.set(doc.id, doc.data());
  });

  const startTimestamp = admin.firestore.Timestamp.fromDate(start);
  const endTimestamp = admin.firestore.Timestamp.fromDate(end);

  const entriesSnapshot = await baseRef
    .collection('journal_entries')
    .where('status', '==', 'posted')
    .where('entryDate', '>=', startTimestamp)
    .where('entryDate', '<=', endTimestamp)
    .get();

  let totalRevenue = 0;
  let totalExpenses = 0;
  let cogs = 0;

  entriesSnapshot.forEach((doc) => {
    const entry = doc.data();

    (entry.lineItems || []).forEach((line) => {
      const account = accountMap.get(line.accountId);
      if (!account) {
        return;
      }

      const debit = Number(line.debitAmount) || 0;
      const credit = Number(line.creditAmount) || 0;
      const normalSide = getNormalBalance(account.accountType);
      const signedAmount = normalSide === 'debit'
        ? debit - credit
        : credit - debit;

      if (account.accountType === 'revenue') {
        totalRevenue += signedAmount;
      } else if (account.accountType === 'expense') {
        if (account.accountSubtype === 'cogs' || account.accountName?.toLowerCase().includes('cogs')) {
          cogs += signedAmount;
        } else {
          totalExpenses += signedAmount;
        }
      }
    });
  });

  const grossProfit = totalRevenue - cogs;
  const netIncome = grossProfit - totalExpenses;

  return {
    period: {
      start: start.toISOString(),
      end: end.toISOString()
    },
    totals: {
      revenue: Number(totalRevenue.toFixed(2)),
      cogs: Number(cogs.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      operatingExpenses: Number(totalExpenses.toFixed(2)),
      netIncome: Number(netIncome.toFixed(2))
    }
  };
}

module.exports = {
  generateBalanceSheet,
  generateIncomeStatement
};


