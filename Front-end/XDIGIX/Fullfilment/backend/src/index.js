import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { clientRouter } from './routes/clients.js';
import { productRouter } from './routes/products.js';
import { transactionRouter } from './routes/transactions.js';
import { auditRouter } from './routes/audit.js';
import { reportsRouter } from './routes/reports.js';
import { notificationsRouter } from './routes/notifications.js';
import { stockRouter } from './routes/stock.js';
import { orderRouter } from './routes/orders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true }));
app.use(express.json());
app.use('/reports', express.static(path.join(__dirname, '..', 'reports')));

app.use('/api/clients', clientRouter);
app.use('/api/products', productRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/audit', auditRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/orders', orderRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
