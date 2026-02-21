/**
 * Firestore Compatibility Service
 * Maps Firestore paths to MongoDB operations.
 */
import { FirestoreDoc } from '../schemas/document.schema';
import { Business } from '../schemas/business.schema';
import { Tenant } from '../schemas/tenant.schema';
import { User } from '../schemas/user.schema';
import { Domain } from '../schemas/domain.schema';
import { Plan } from '../schemas/plan.schema';
import { LinkRequest } from '../schemas/link-request.schema';
import { SuperAdminInvite } from '../schemas/super-admin-invite.schema';

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit';
  field?: string;
  op?: '==' | '!=' | '>' | '>=' | '<' | '<=';
  value?: unknown;
  direction?: 'asc' | 'desc';
  limit?: number;
}

/** Normalize constraint value for date range queries (frontend sends ISO string). */
function normalizeConstraintValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof value === 'number' && value > 1e10) return new Date(value);
  return value;
}

export function parsePath(path: string): { coll: string; docId?: string; subPath: string[] } {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { coll: '', docId: undefined, subPath: [] };
  if (parts.length === 1) return { coll: parts[0], docId: undefined, subPath: [] };
  if (parts.length === 2) return { coll: parts[0], docId: parts[1], subPath: [] };
  // businesses/bid1/orders/oid1 -> coll: businesses, docId: bid1, subPath: [orders, oid1]
  return {
    coll: parts[0],
    docId: parts[1],
    subPath: parts.slice(2),
  };
}

export async function getDocument(path: string, tenantId?: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const { coll: col, docId, subPath } = parsePath(path);

  // Top-level colls
  if (col === 'businesses' && docId && subPath.length === 0) {
    const filter: Record<string, unknown> = { businessId: docId };
    if (tenantId) filter.tenantId = tenantId;
    const doc = await Business.findOne(filter).lean();
    if (!doc) return null;
    const { _id, __v, ...data } = doc as Record<string, unknown>;
    return { id: docId, data };
  }

  if (col === 'tenants' && docId && subPath.length === 0) {
    const doc = await Tenant.findOne({ tenantId: docId }).lean();
    if (!doc) return null;
    const { _id, __v, ...data } = doc as Record<string, unknown>;
    return { id: docId, data };
  }

  if (col === 'users' && docId && subPath.length === 0) {
    const doc = await User.findOne({ uid: docId }).lean();
    if (!doc) return null;
    const { _id, __v, passwordHash, ...data } = doc as Record<string, unknown>;
    return { id: docId, data };
  }

  if (col === 'plans' && docId && subPath.length === 0) {
    const doc = await Plan.findById(docId).lean();
    if (!doc) return null;
    const { _id, __v, ...data } = doc as Record<string, unknown>;
    return { id: docId, data };
  }

  if (col === 'superAdminInvites' && docId && subPath.length === 0) {
    const doc = await SuperAdminInvite.findOne({ inviteId: docId }).lean();
    if (!doc) return null;
    const { _id, __v, ...data } = doc as Record<string, unknown>;
    return { id: docId, data };
  }

  // Subcolls: businesses/bid1/orders/oid1
  if (col === 'businesses' && docId && subPath.length >= 2) {
    const subCol = subPath[0];
    const subDocId = subPath[1];
    const filter: Record<string, unknown> = {
      businessId: docId,
      coll: subCol,
      docId: subDocId,
    };
    if (tenantId) filter.tenantId = tenantId;
    const doc = await FirestoreDoc.findOne(filter).lean();
    if (!doc) return null;
    return { id: subDocId, data: (doc as { data: Record<string, unknown> }).data || {} };
  }

  // customDomains - special: query by tenantId
  if (col === 'customDomains' && !docId && tenantId) {
    // List only - single doc get would need domainId
    return null;
  }

  return null;
}

export async function queryCollection(
  path: string,
  tenantId: string,
  constraints: QueryConstraint[] = []
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const { coll: col, docId, subPath } = parsePath(path);

  // Top-level: businesses, tenants, users, plans, etc.
  if (col === 'businesses' && !docId) {
    const filter: Record<string, unknown> = tenantId ? { tenantId } : {};
    const orderBy = constraints.find((c) => c.type === 'orderBy');
    const limit = constraints.find((c) => c.type === 'limit');
    const whereClauses = constraints.filter((c) => c.type === 'where');
    for (const w of whereClauses) {
      if (w.field && w.op === '==' && w.value !== undefined) {
        filter[w.field] = w.value;
      }
    }
    let q = Business.find(filter).lean();
    if (orderBy?.field) q = q.sort({ [orderBy.field]: orderBy.direction === 'desc' ? -1 : 1 });
    if (limit?.limit) q = q.limit(limit.limit);
    const docs = await q;
    return docs.map((d: { businessId: string; [k: string]: unknown }) => {
      const { _id, __v, businessId, ...data } = d;
      return { id: businessId, data };
    });
  }

  if (col === 'tenants' && !docId) {
    const docs = await Tenant.find({}).lean();
    return docs.map((d: { tenantId: string; [k: string]: unknown }) => {
      const { _id, __v, tenantId: tid, ...data } = d;
      return { id: tid, data };
    });
  }

  if (col === 'users' && !docId) {
    const filter: Record<string, unknown> = {};
    const whereClauses = constraints.filter((c) => c.type === 'where');
    for (const w of whereClauses) {
      if (w.field && w.op === '==' && w.value !== undefined) {
        filter[w.field] = w.value;
      }
    }
    let q = User.find(filter).select('-passwordHash').lean();
    const orderBy = constraints.find((c) => c.type === 'orderBy');
    const limit = constraints.find((c) => c.type === 'limit');
    if (orderBy?.field) q = q.sort({ [orderBy.field]: orderBy.direction === 'desc' ? -1 : 1 });
    if (limit?.limit) q = q.limit(limit.limit);
    const docs = await q;
    return docs.map((d: { uid: string; [k: string]: unknown }) => {
      const { _id, __v, uid, ...data } = d;
      return { id: uid, data };
    });
  }

  if (col === 'plans' && !docId) {
    const docs = await Plan.find({}).lean();
    return docs.map((d: { _id: { toString: () => string }; [k: string]: unknown }) => {
      const { _id, __v, ...data } = d;
      return { id: (_id as { toString: () => string }).toString(), data };
    });
  }

  if (col === 'customDomains' && !docId && tenantId) {
    const docs = await Domain.find({ tenantId }).lean();
    return docs.map((d: { _id: { toString: () => string }; domain: string; [k: string]: unknown }) => {
      const { _id, __v, ...data } = d;
      return { id: (_id as { toString: () => string }).toString(), data };
    });
  }

  if (col === 'linkRequests' && !docId) {
    const filter: Record<string, unknown> = {};
    const whereClauses = constraints.filter((c) => c.type === 'where');
    for (const w of whereClauses) {
      if (w.field && w.op === '==' && w.value !== undefined) {
        filter[w.field] = w.value;
      }
    }
    let q = LinkRequest.find(filter).lean();
    const orderBy = constraints.find((c) => c.type === 'orderBy');
    const limit = constraints.find((c) => c.type === 'limit');
    if (orderBy?.field) q = q.sort({ [orderBy.field]: orderBy.direction === 'desc' ? -1 : 1 });
    if (limit?.limit) q = q.limit(limit.limit);
    const docs = await q;
    return docs.map((d: { _id: { toString: () => string }; [k: string]: unknown }) => {
      const { _id, __v, ...data } = d;
      return { id: (_id as { toString: () => string }).toString(), data };
    });
  }

  if (col === 'superAdminInvites' && !docId) {
    const filter: Record<string, unknown> = {};
    const whereClauses = constraints.filter((c) => c.type === 'where');
    for (const w of whereClauses) {
      if (w.field && w.op === '==' && w.value !== undefined) {
        filter[w.field] = w.value;
      }
    }
    const docs = await SuperAdminInvite.find(filter).lean();
    return docs.map((d: { inviteId: string; [k: string]: unknown }) => {
      const { _id, __v, inviteId, ...data } = d;
      return { id: inviteId, data };
    });
  }

  // Subcolls: businesses/bid1/products, orders, etc.
  if (col === 'businesses' && docId && subPath.length === 1) {
    const subCol = subPath[0];
    const filter: Record<string, unknown> = { businessId: docId, coll: subCol };
    // Don't filter by tenantId - businessId alone scopes the data; avoids migration tenantId mismatches
    const orderBy = constraints.find((c) => c.type === 'orderBy');
    const limit = constraints.find((c) => c.type === 'limit');
    const whereClauses = constraints.filter((c) => c.type === 'where');
    const subFilter: Record<string, unknown> = {};
    for (const w of whereClauses) {
      if (!w.field || w.op === undefined || w.value === undefined) continue;
      const key = `data.${w.field}`;
      const val = normalizeConstraintValue(w.value);
      if (w.op === '==') {
        subFilter[key] = val;
        continue;
      }
      if (w.op === '>=' || w.op === '<=') {
        const existing = (subFilter[key] as Record<string, unknown>) || {};
        if (w.op === '>=') subFilter[key] = { ...existing, $gte: val };
        else subFilter[key] = { ...existing, $lte: val };
      }
    }
    Object.assign(filter, subFilter);
    // "My products" must not include XDF (linked fulfillment) – those are only in linked-inventory
    if (subCol === 'products') {
      filter.$and = [
        { $or: [{ 'data.inventorySource': { $exists: false } }, { 'data.inventorySource': { $ne: 'XDF' } }] },
      ];
    }
    let q = FirestoreDoc.find(filter).lean();
    if (orderBy?.field) {
      const sortKey = `data.${orderBy.field}`;
      q = q.sort({ [sortKey]: orderBy.direction === 'desc' ? -1 : 1 });
    }
    if (limit?.limit) q = q.limit(limit.limit);
    const docs = await q;
    return docs.map((d: { docId: string; data?: Record<string, unknown> }) => ({
      id: d.docId,
      data: d.data || {},
    }));
  }

  return [];
}

export async function setDocument(
  path: string,
  data: Record<string, unknown>,
  tenantId: string,
  merge = false,
  superAdminNoTenant = false
): Promise<{ id: string }> {
  const { coll: col, docId, subPath } = parsePath(path);

  if (col === 'businesses' && docId && subPath.length === 0) {
    const payload = { ...data, updatedAt: new Date() };
    const filter: Record<string, unknown> = { businessId: docId };
    if (tenantId || !superAdminNoTenant) filter.tenantId = tenantId;
    const existing = await Business.findOne(filter).lean();
    const effectiveTenantId = tenantId || (existing as { tenantId?: string } | null)?.tenantId || docId;
    await Business.findOneAndUpdate(
      filter,
      merge ? { $set: payload } : { ...payload, tenantId: effectiveTenantId, businessId: docId },
      { upsert: true, new: true }
    );
    return { id: docId };
  }

  if (col === 'users' && docId && subPath.length === 0) {
    const { passwordHash, ...rest } = data;
    const update = merge ? { $set: { ...rest, updatedAt: new Date() } } : { ...rest, updatedAt: new Date() };
    await User.findOneAndUpdate({ uid: docId }, update, { upsert: true, new: true });
    return { id: docId };
  }

  if (col === 'tenants' && docId && subPath.length === 0) {
    const update = merge ? { $set: { ...data, updatedAt: new Date() } } : { ...data, updatedAt: new Date() };
    await Tenant.findOneAndUpdate({ tenantId: docId }, update, { upsert: true, new: true });
    return { id: docId };
  }

  if (col === 'plans' && docId && subPath.length === 0) {
    await Plan.findByIdAndUpdate(docId, { $set: { ...data, updatedAt: new Date() } }, { upsert: false });
    return { id: docId };
  }

  if (col === 'businesses' && docId && subPath.length >= 2) {
    const subCol = subPath[0];
    const subDocId = subPath[1];
    const fullData = { ...data, updatedAt: new Date() };
    await FirestoreDoc.findOneAndUpdate(
      { tenantId, businessId: docId, coll: subCol, docId: subDocId },
      merge ? { $set: { data: fullData } } : { tenantId, businessId: docId, coll: subCol, docId: subDocId, data: fullData },
      { upsert: true }
    );
    return { id: subDocId };
  }

  throw new Error(`Unsupported path for setDocument: ${path}`);
}

export async function updateDocument(
  path: string,
  data: Record<string, unknown>,
  tenantId?: string,
  superAdminNoTenant = false
): Promise<void> {
  await setDocument(path, data, tenantId || '', true, superAdminNoTenant);
}

export async function addDocument(
  path: string,
  data: Record<string, unknown>,
  tenantId: string
): Promise<{ id: string }> {
  const { coll: col, docId, subPath } = parsePath(path);
  const { v4: uuidv4 } = await import('uuid');
  const newId = uuidv4().replace(/-/g, '').slice(0, 20);

  if (col === 'tenants' && !docId) {
    const doc = await Tenant.create({ ...data, tenantId: newId });
    return { id: doc.tenantId };
  }

  if (col === 'users' && !docId) {
    const doc = await User.create({ ...data, uid: newId });
    return { id: doc.uid };
  }

  if (col === 'linkRequests' && !docId) {
    const doc = await LinkRequest.create(data);
    return { id: (doc as { _id: { toString: () => string } })._id.toString() };
  }

  if (col === 'businesses' && docId && subPath.length === 1) {
    const subCol = subPath[0];
    await FirestoreDoc.create({
      tenantId,
      businessId: docId,
      coll: subCol,
      docId: newId,
      data: { ...data, createdAt: new Date() },
    });
    return { id: newId };
  }

  if (col === 'superAdminInvites' && !docId) {
    const doc = await SuperAdminInvite.create({ ...data, inviteId: newId });
    return { id: doc.inviteId };
  }

  throw new Error(`Unsupported path for addDocument: ${path}`);
}

export async function deleteDocument(path: string, tenantId?: string): Promise<void> {
  const { coll: col, docId, subPath } = parsePath(path);

  if (col === 'businesses' && docId && subPath.length === 0) {
    const filter: Record<string, unknown> = { businessId: docId };
    if (tenantId) filter.tenantId = tenantId;
    await Business.deleteOne(filter);
    // Cascade: delete owner User so email can be reused for new client
    await User.deleteMany({ businessId: docId });
    // Cascade: delete subcollection docs (staff, products, orders, etc.)
    await FirestoreDoc.deleteMany({ businessId: docId });
    return;
  }

  if (col === 'users' && docId && subPath.length === 0) {
    await User.deleteOne({ uid: docId });
    return;
  }

  if (col === 'tenants' && docId && subPath.length === 0) {
    await Tenant.deleteOne({ tenantId: docId });
    return;
  }

  if (col === 'plans' && docId && subPath.length === 0) {
    await Plan.findByIdAndDelete(docId);
    return;
  }

  if (col === 'businesses' && docId && subPath.length >= 2) {
    const subCol = subPath[0];
    const subDocId = subPath[1];
    const filter: Record<string, unknown> = { businessId: docId, coll: subCol, docId: subDocId };
    if (tenantId) filter.tenantId = tenantId;
    await FirestoreDoc.deleteOne(filter);
    return;
  }

  if (col === 'linkRequests' && docId) {
    await LinkRequest.findByIdAndDelete(docId);
    return;
  }

  if (col === 'superAdminInvites' && docId) {
    await SuperAdminInvite.deleteOne({ inviteId: docId });
    return;
  }

  throw new Error(`Unsupported path for deleteDocument: ${path}`);
}
