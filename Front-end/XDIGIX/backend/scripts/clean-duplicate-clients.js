/**
 * Remove duplicate clients - keep one per (brandName, owner.email).
 * Updates Products, Orders, Users, Payments, Returns, ScanLogs to reference the kept client.
 *
 * Run: node scripts/clean-duplicate-clients.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../src/models/Client');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const User = require('../src/models/User');
const Payment = require('../src/models/Payment');
const Return = require('../src/models/Return');
const ScanLog = require('../src/models/ScanLog');

async function cleanDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db');
    console.log('MongoDB connected\n');

    const clients = await Client.find().sort({ createdAt: 1 }).lean();
    const groups = new Map(); // key: brandName|email -> [{ _id, ... }]

    for (const c of clients) {
      const key = `${(c.brandName || '').trim().toLowerCase()}|${(c.owner?.email || '').trim().toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }

    const toKeep = [];
    const toDelete = []; // { id, mergeInto }
    for (const [, list] of groups) {
      if (list.length === 0) continue;
      const keep = list[0];
      toKeep.push(keep._id.toString());
      for (let i = 1; i < list.length; i++) {
        toDelete.push({ id: list[i]._id.toString(), mergeInto: keep._id.toString() });
      }
    }

    if (toDelete.length === 0) {
      console.log('No duplicate clients found.');
      process.exit(0);
      return;
    }

    console.log(`Found ${toDelete.length} duplicate(s) to remove.\n`);

    for (const { id, mergeInto } of toDelete) {
      const dup = clients.find((c) => String(c._id) === id);
      const keep = clients.find((c) => String(c._id) === mergeInto);
      console.log(`  Merge ${dup?.brandName} (${id}) → keep (${mergeInto})`);

      await Product.updateMany({ clientId: id }, { $set: { clientId: mergeInto } });
      await Order.updateMany({ clientId: id }, { $set: { clientId: mergeInto } });
      await User.updateMany({ clientId: id }, { $set: { clientId: mergeInto } });
      await Payment.updateMany({ clientId: id }, { $set: { clientId: mergeInto } });
      await Return.updateMany({ clientId: id }, { $set: { clientId: mergeInto } });
      await ScanLog.updateMany({ clientId: id }, { $set: { clientId: mergeInto } });

      await Client.findByIdAndDelete(id);
    }

    console.log(`\nRemoved ${toDelete.length} duplicate client(s).`);
    console.log(`Remaining clients: ${toKeep.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

cleanDuplicates().catch((err) => {
  console.error(err);
  process.exit(1);
});
