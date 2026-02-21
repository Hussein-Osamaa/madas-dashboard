const { admin, db, getOrganizationRef } = require('./accounting');
const { createJournalEntry } = require('./journalEntry');

function calculateInvoiceTotals(items = []) {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const lineSubtotal = quantity * unitPrice;
    const lineDiscount = lineSubtotal * (discount / 100);
    const lineTaxable = lineSubtotal - lineDiscount;
    const lineTax = lineTaxable * (taxRate / 100);
    const lineTotal = lineTaxable + lineTax;

    subtotal += lineSubtotal;
    discountAmount += lineDiscount;
    taxAmount += lineTax;

    return {
      ...item,
      quantity,
      unitPrice,
      discount,
      taxRate,
      taxAmount: Number(lineTax.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2))
    };
  });

  const totalAmount = subtotal - discountAmount + taxAmount;

  return {
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2))
  };
}

async function createInvoiceFromSale({
  workspaceId,
  orgId,
  invoiceData = {},
  journalEntryData = null
}) {
  if (!workspaceId || !orgId) {
    throw new Error('workspaceId and orgId are required');
  }

  const baseRef = getOrganizationRef(workspaceId, orgId);
  const invoiceRef = baseRef.collection('invoices').doc();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  const {
    customerId = null,
    customerName = '',
    customerEmail = '',
    items = [],
    status = 'draft',
    payments = [],
    currency = 'USD',
    notes = '',
    terms = '',
    invoiceNumber = invoiceRef.id,
    invoiceDate,
    dueDate,
    metadata = {}
  } = invoiceData;

  const totals = calculateInvoiceTotals(items);
  const paidAmount = payments.reduce((acc, payment) => acc + (Number(payment.amount) || 0), 0);
  const balanceAmount = totals.totalAmount - paidAmount;

  const payload = {
    invoiceId: invoiceRef.id,
    invoiceNumber,
    customerId,
    customerName,
    customerEmail,
    status,
    currency,
    notes,
    terms,
    items: totals.items,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    paidAmount: Number(paidAmount.toFixed(2)),
    balanceAmount: Number(balanceAmount.toFixed(2)),
    payments: payments.map((payment) => ({
      ...payment,
      amount: Number((payment.amount || 0).toFixed(2)),
      paymentDate: payment.paymentDate
        ? admin.firestore.Timestamp.fromDate(new Date(payment.paymentDate))
        : null
    })),
    invoiceDate: invoiceDate
      ? admin.firestore.Timestamp.fromDate(new Date(invoiceDate))
      : admin.firestore.Timestamp.now(),
    dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: invoiceData.createdBy || null,
    updatedBy: invoiceData.createdBy || null,
    workspaceId,
    orgId,
    metadata
  };

  await invoiceRef.set(payload);

  let journalEntryId = null;
  if (journalEntryData && totals.totalAmount !== 0) {
    const entry = await createJournalEntry(workspaceId, orgId, {
      ...journalEntryData,
      entryDate: journalEntryData.entryDate || invoiceDate || new Date().toISOString(),
      reference: invoiceNumber,
      referenceType: journalEntryData.referenceType || 'invoice',
      description: journalEntryData.description || `Invoice ${invoiceNumber} for ${customerName}`
    });

    journalEntryId = entry.id;
    await invoiceRef.update({
      journalEntryId,
      status: status === 'draft' ? 'posted' : status,
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
      postedBy: journalEntryData.createdBy || invoiceData.createdBy || null
    });
  }

  const snapshot = await invoiceRef.get();
  return {
    id: invoiceRef.id,
    ...snapshot.data(),
    journalEntryId
  };
}

module.exports = {
  createInvoiceFromSale,
  calculateInvoiceTotals
};



