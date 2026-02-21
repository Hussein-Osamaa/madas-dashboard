/**
 * Firebase to MongoDB Migration
 * Dry run by default. Set DRY_RUN=false to execute.
 */
import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import mongoose from 'mongoose';
import { config } from '../config';
import { FirestoreDoc, Business, User, Tenant, Domain } from '../schemas';

const DRY_RUN = process.env.DRY_RUN !== 'false';

/** Convert Firestore Timestamp (or seconds object) to Date for MongoDB. */
function toDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null && ('seconds' in v || '_seconds' in v)) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) return new Date(sec * 1000);
  }
  return undefined;
}

/** Recursively normalize Timestamp fields to Date so MongoDB range queries work. */
function normalizeData(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      out[k] = v;
      continue;
    }
    const asDate = toDate(v);
    if (asDate !== undefined) {
      out[k] = asDate;
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) => {
        const d = toDate(item);
        if (d !== undefined) return d;
        if (typeof item === 'object' && item !== null && !(item instanceof Date)) {
          return normalizeData(item as Record<string, unknown>);
        }
        return item;
      });
      continue;
    }
    if (typeof v === 'object' && !(v instanceof Date)) {
      out[k] = normalizeData(v as Record<string, unknown>);
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function initFirebase(): Promise<admin.firestore.Firestore> {
  if (!admin.apps.length) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS required for migration.\n' +
          '  Option 1: Add to sys/backend/.env:\n' +
          '    GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-firebase-service-account.json\n' +
          '  Option 2: Run with the variable set:\n' +
          '    GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json DRY_RUN=false npm run migrate\n' +
          '  Get the JSON from Firebase Console → Project Settings → Service Accounts → Generate new private key.'
      );
    }
    const path = require('path');
    const resolvedPath = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
    admin.initializeApp({ credential: admin.credential.cert(require(resolvedPath)) });
  }
  return admin.firestore();
}

async function migrate() {
  console.log('[Migration] Starting... DRY_RUN=', DRY_RUN);

  const firestore = await initFirebase();
  await mongoose.connect(config.mongo.uri);

  const counts = { businesses: 0, orders: 0, products: 0, users: 0, tenants: 0, domains: 0, customers: 0, finance: 0 };

  try {
    // Migrate tenants
    const tenantsSnap = await firestore.collection('tenants').get();
    for (const doc of tenantsSnap.docs) {
      const data = doc.data();
      const payload = {
        tenantId: doc.id,
        name: data.name || doc.id,
        plan: data.plan?.type || 'saas',
        features: data.features || [],
        status: data.status || 'active',
      };
      if (!DRY_RUN) {
        await Tenant.findOneAndUpdate({ tenantId: doc.id }, payload, { upsert: true });
      }
      counts.tenants++;
    }
    console.log('[Migration] Tenants:', counts.tenants);

    // Migrate businesses
    const businessesSnap = await firestore.collection('businesses').get();
    for (const doc of businessesSnap.docs) {
      const data = doc.data();
      const tenantId = data.tenantId || doc.id;
      const owner = data.owner as { uid?: string; userId?: string; email?: string } | undefined;
      const payload = {
        businessId: doc.id,
        tenantId,
        name: data.name || data.businessName || doc.id,
        owner: owner
          ? { userId: owner.uid || owner.userId, email: (owner.email || '').toLowerCase().trim() }
          : undefined,
        linkedBusinessIds: data.linkedBusinessIds || [],
        plan: data.plan,
      };
      if (!DRY_RUN) {
        await Business.findOneAndUpdate({ businessId: doc.id }, payload, { upsert: true });
      }
      counts.businesses++;

      // Migrate subcollections: products, orders, collections, customers, finance, etc.
      const financeSubcollections = new Set([
        'deposits', 'cash_flow_transactions', 'expenses', 'finance_settings', 'profit_partners',
        'partner_payments', 'profit_calculations', 'profit_audit_log', 'finance_budgets', 'finance_reports',
        'transactions', 'payments', 'finance_accounts', 'finance_account_transfers', 'finance_account_reconciliations',
      ]);
      const subcollections = [
        'products',
        'orders',
        'collections',
        'published_sites',
        'staff',
        'abandonedCarts',
        'scan_log',
        'deposits',
        'discounts',
        'cash_flow_transactions',
        'customers',
        'expenses',
        'finance_settings',
        'profit_partners',
        'partner_payments',
        'profit_calculations',
        'profit_audit_log',
        'finance_budgets',
        'finance_reports',
        'transactions',
        'payments',
        'finance_accounts',
        'finance_account_transfers',
        'finance_account_reconciliations',
      ];
      for (const sub of subcollections) {
        const subSnap = await firestore.collection('businesses').doc(doc.id).collection(sub).get();
        for (const subDoc of subSnap.docs) {
          const raw = subDoc.data();
          const subData = normalizeData(raw);
          if (!DRY_RUN) {
            await FirestoreDoc.findOneAndUpdate(
              { tenantId, businessId: doc.id, coll: sub, docId: subDoc.id },
              { tenantId, businessId: doc.id, coll: sub, docId: subDoc.id, data: subData },
              { upsert: true }
            );
          }
          if (sub === 'orders') counts.orders++;
          if (sub === 'products') counts.products++;
          if (sub === 'customers') counts.customers++;
          if (financeSubcollections.has(sub)) counts.finance++;
        }
      }
    }
    console.log('[Migration] Businesses:', counts.businesses, 'Orders:', counts.orders, 'Products:', counts.products, 'Customers:', counts.customers, 'Finance docs:', counts.finance);

    // Migrate users (profile docs; Auth users need separate handling)
    const usersSnap = await firestore.collection('users').get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const payload = {
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName,
        type: data.type || 'client_staff',
        businessId: data.businessId,
        tenantId: data.tenantId,
        permissions: data.permissions,
        emailVerified: data.emailVerified ?? false,
      };
      if (!DRY_RUN) {
        await User.findOneAndUpdate({ uid: doc.id }, payload, { upsert: true });
      }
      counts.users++;
    }
    console.log('[Migration] Users:', counts.users);

    // Migrate customDomains
    const domainsSnap = await firestore.collection('customDomains').get();
    for (const doc of domainsSnap.docs) {
      const data = doc.data();
      const payload = {
        tenantId: data.tenantId,
        siteId: data.siteId,
        domain: data.domain,
        rootDomain: data.rootDomain || data.domain,
        isSubdomain: data.isSubdomain ?? false,
        status: data.status || 'pending_dns',
        verificationToken: data.verificationToken || '',
        dnsRecords: data.dnsRecords,
        failureCount: data.failureCount || 0,
      };
      if (!DRY_RUN) {
        await Domain.findOneAndUpdate({ domain: data.domain }, payload, { upsert: true });
      }
      counts.domains++;
    }
    console.log('[Migration] Domains:', counts.domains);

    console.log('[Migration] Done. Counts:', counts);
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((err) => {
  console.error('[Migration] Error:', err);
  process.exit(1);
});
