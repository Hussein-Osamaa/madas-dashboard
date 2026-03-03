import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.join(__dirname, '../../reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

export function generateReportPdf(data) {
  return new Promise((resolve, reject) => {
    const filename = `report-${data.periodType}-${data.periodLabel}-${Date.now()}.pdf`;
    const filepath = path.join(reportsDir, filename);
    const doc = new PDFDocument({ margin: 50 });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(18).text('Inventory Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${data.clientName}`);
    doc.text(`Period: ${data.periodType} - ${data.periodLabel}`);
    doc.moveDown();
    doc.text(`Opening Balance: ${data.openingBalance}`);
    doc.text(`Total Inbound: ${data.totalInbound}`);
    doc.text(`Total Sold: ${data.totalSold}`);
    doc.text(`Total Damaged: ${data.totalDamaged}`);
    doc.text(`Total Missing: ${data.totalMissing}`);
    doc.text(`Closing Balance: ${data.closingBalance}`);
    doc.moveDown();
    doc.fontSize(10).text(`Generated at ${new Date().toISOString()}`, { align: 'right' });

    doc.end();

    stream.on('finish', () => resolve(filepath));
    stream.on('error', reject);
    doc.on('error', reject);
  });
}
