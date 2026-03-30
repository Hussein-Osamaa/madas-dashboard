/**
 * Migrate products from FirestoreDoc to the new Product model.
 * Run: npx ts-node src/scripts/migrate-products.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { config } from '../config';
import { FirestoreDoc } from '../schemas/document.schema';
import { Product, IVariantStock } from '../modules/inventory/product.schema';

interface FirestoreProductData {
  name?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  sellingPrice?: number;
  currency?: string;
  images?: string[];
  vendor?: string;
  sku?: string;
  barcode?: string;
  tags?: string[];
  variants?: Array<{ name: string; values: string[] }>;
  stock?: Record<string, unknown>;
  lowStockThreshold?: number;
  status?: string;
  collectionId?: string;
  onSale?: boolean;
  salePrice?: number;
  deleted?: boolean;
  [key: string]: unknown;
}

function defaultStock(): IVariantStock {
  return { on_hand: 0, reserved: 0, damaged: 0, missing: 0 };
}

function normalizeStock(raw: Record<string, unknown> | undefined): Record<string, IVariantStock> {
  if (!raw) return { default: defaultStock() };

  const result: Record<string, IVariantStock> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'object' && value !== null) {
      const v = value as Record<string, unknown>;
      result[key] = {
        on_hand: typeof v.on_hand === 'number' ? v.on_hand : (typeof v.quantity === 'number' ? v.quantity : 0),
        reserved: typeof v.reserved === 'number' ? v.reserved : 0,
        damaged: typeof v.damaged === 'number' ? v.damaged : 0,
        missing: typeof v.missing === 'number' ? v.missing : 0,
      };
    } else if (typeof value === 'number') {
      // Simple numeric stock: treat as on_hand
      result[key] = { on_hand: value, reserved: 0, damaged: 0, missing: 0 };
    }
  }

  if (Object.keys(result).length === 0) {
    result['default'] = defaultStock();
  }
  return result;
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongo.uri);
  console.log('Connected.');

  const docs = await FirestoreDoc.find({
    coll: 'products',
    'data.deleted': { $ne: true },
  });

  console.log(`Found ${docs.length} product documents to migrate.`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of docs) {
    try {
      const data = doc.data as FirestoreProductData;

      // Skip products without a name
      if (!data.name) {
        console.warn(`Skipping doc ${doc.docId}: no name`);
        skipped++;
        continue;
      }

      // Check if already migrated (by sku + tenantId, or by checking a reference)
      if (data.sku) {
        const existing = await Product.findOne({
          tenantId: doc.tenantId,
          sku: data.sku,
        });
        if (existing) {
          console.log(`Skipping doc ${doc.docId}: sku=${data.sku} already exists`);
          skipped++;
          continue;
        }
      }

      const variants = Array.isArray(data.variants) ? data.variants : [];
      const stock = normalizeStock(data.stock as Record<string, unknown> | undefined);

      await Product.create({
        tenantId: doc.tenantId,
        businessId: doc.businessId ?? '',
        name: data.name,
        description: data.description ?? '',
        price: typeof data.price === 'number' ? data.price : 0,
        compareAtPrice: data.compareAtPrice,
        sellingPrice: data.sellingPrice,
        currency: data.currency ?? 'EGP',
        images: Array.isArray(data.images) ? data.images : [],
        vendor: data.vendor,
        sku: data.sku,
        barcode: data.barcode,
        tags: Array.isArray(data.tags) ? data.tags : [],
        variants,
        stock,
        lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 0,
        status: ['active', 'draft', 'archived'].includes(data.status ?? '')
          ? data.status
          : 'active',
        collectionId: data.collectionId,
        onSale: data.onSale ?? false,
        salePrice: data.salePrice,
        deleted: false,
      });

      created++;
    } catch (err) {
      console.error(`Error migrating doc ${doc.docId}:`, (err as Error).message);
      errors++;
    }
  }

  console.log('\n--- Migration Results ---');
  console.log(`  Total docs:  ${docs.length}`);
  console.log(`  Created:     ${created}`);
  console.log(`  Skipped:     ${skipped}`);
  console.log(`  Errors:      ${errors}`);

  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
