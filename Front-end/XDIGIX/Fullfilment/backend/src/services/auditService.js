import { AuditSession } from '../models/AuditSession.js';
import { Product } from '../models/Product.js';
import { getExpectedAvailableForProduct, createTransaction, getMonth } from './stockService.js';
import { runWeeklyReportForClient } from './reportService.js';

/**
 * Count occurrences of barcode in scanned list.
 */
function countByBarcode(scannedBarcodes) {
  const counts = {};
  for (const b of scannedBarcodes) {
    counts[b] = (counts[b] || 0) + 1;
  }
  return counts;
}

/**
 * After audit session finishes: compare expected vs scanned, create MISSING/ADJUSTMENT/AUDIT.
 */
export async function finishAuditSession(sessionId) {
  const session = await AuditSession.findById(sessionId);
  if (!session) throw new Error('Audit session not found');
  if (session.finishedAt) throw new Error('Audit session already finished');

  session.finishedAt = new Date();
  await session.save();

  const scannedCounts = countByBarcode(session.scannedBarcodes);
  const barcodes = Object.keys(scannedCounts);
  const products = await Product.find({ barcode: { $in: barcodes }, clientId: session.clientId });
  const productByBarcode = {};
  for (const p of products) productByBarcode[p.barcode] = p;

  const month = getMonth();

  for (const barcode of barcodes) {
    const product = productByBarcode[barcode];
    if (!product) continue;

    const expected = await getExpectedAvailableForProduct(product._id);
    const scanned = scannedCounts[barcode] || 0;
    const diff = scanned - expected;

    await createTransaction({
      productId: product._id,
      clientId: session.clientId,
      type: 'AUDIT',
      quantity: scanned,
      reference: String(sessionId),
      month,
    });

    if (diff < 0) {
      await createTransaction({
        productId: product._id,
        clientId: session.clientId,
        type: 'MISSING',
        quantity: -diff,
        reference: String(sessionId),
        month,
      });
    } else if (diff > 0) {
      await createTransaction({
        productId: product._id,
        clientId: session.clientId,
        type: 'ADJUSTMENT',
        quantity: diff,
        reference: String(sessionId),
        month,
      });
    }
  }

  await runWeeklyReportForClient(session.clientId);
  return session;
}
