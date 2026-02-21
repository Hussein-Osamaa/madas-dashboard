import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import {
  getDocument,
  queryCollection,
  setDocument,
  updateDocument,
  addDocument,
  deleteDocument,
  type QueryConstraint,
} from '../services/firestore.service';
import { orderEvents, ORDER_CREATED, ORDER_STATUS_CHANGED } from '../events/orderEvents';

function parsePath(path: string): { businessId?: string; subCol?: string; subDocId?: string } {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'businesses' && parts.length >= 2) {
    return {
      businessId: parts[1],
      subCol: parts[2],
      subDocId: parts[3],
    };
  }
  return {};
}

const router = Router();
router.use(jwtMiddleware);
router.use(tenantMiddleware);

function getPath(req: Request): string {
  let path = req.path.replace(/^\//, '').replace(/\/$/, '');
  // Firestore router mounted at /firestore gives path like /documents/users/uid - strip /documents
  if (path.startsWith('documents/')) path = path.slice('documents/'.length);
  return path;
}

/** Paths that are optional (staff, dashboard stats/analysis, shipping settings). Return 200 + empty doc instead of 404. */
function isOptionalDocument(path: string): boolean {
  const parts = path.split('/');
  if (parts[0] === 'businesses' && parts.length >= 4) {
    if (parts[2] === 'staff') return true; // missing staff doc → owner defaults (e.g. after link-clients)
    if (parts[2] === 'stats' && parts[3] === 'dashboard') return true;
    if (parts[2] === 'analysis') return true; // topProducts, salesByCategory, etc.
  }
  if (parts[0] === 'tenants' && parts.length >= 4 && parts[2] === 'settings' && parts[3] === 'shipping') return true;
  return false;
}

router.get('/documents/*', async (req: Request, res: Response) => {
  const path = getPath(req);
  if (!path) {
    res.status(400).json({ error: 'Path required', code: 'firestore/invalid-path' });
    return;
  }
  const tenantId = req.tenantId;
  const doc = await getDocument(path, tenantId);
  if (!doc) {
    if (isOptionalDocument(path)) {
      res.json({ id: '', data: {} });
      return;
    }
    res.status(404).json({ error: 'Document not found', code: 'firestore/not-found' });
    return;
  }
  res.json({ id: doc.id, data: doc.data });
});

router.post('/query', async (req: Request, res: Response) => {
  const { path, constraints = [] } = req.body as { path: string; constraints?: QueryConstraint[] };
  if (!path) {
    res.status(400).json({ error: 'Path required', code: 'firestore/invalid-path' });
    return;
  }
  // Super-admin can query businesses/tenants/users without tenantId (lists all)
  const isTopLevelList = path === 'businesses' || path === 'tenants';
  const superAdminNoTenant = req.user?.type === 'super_admin';
  if (!isTopLevelList && !superAdminNoTenant && !req.tenantId) {
    res.status(400).json({ error: 'Path and tenant required', code: 'firestore/invalid-path' });
    return;
  }
  const docs = await queryCollection(path, req.tenantId || '', constraints);
  res.json({ docs: docs.map((d) => ({ id: d.id, data: d.data })) });
});

router.post('/documents/*', async (req: Request, res: Response) => {
  const path = getPath(req);
  const { data, merge = false } = req.body as { data: Record<string, unknown>; merge?: boolean };
  if (!path || !data || !req.tenantId) {
    res.status(400).json({ error: 'Path, data and tenant required', code: 'firestore/invalid-argument' });
    return;
  }
  try {
    const result = await setDocument(path, data, req.tenantId, merge);
    res.json({ id: result.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, code: 'firestore/internal' });
  }
});

router.patch('/documents/*', async (req: Request, res: Response) => {
  const path = getPath(req);
  const { data } = req.body as { data: Record<string, unknown> };
  const allowNoTenant = req.user?.type === 'super_admin';
  if (!path || !data) {
    res.status(400).json({ error: 'Path and data required', code: 'firestore/invalid-argument' });
    return;
  }
  if (!allowNoTenant && !req.tenantId) {
    res.status(400).json({ error: 'Tenant required', code: 'firestore/invalid-argument' });
    return;
  }
  try {
    const { businessId, subCol, subDocId } = parsePath(path);
    let previousDoc: { id: string; data: Record<string, unknown> } | null = null;
    if (businessId && subCol === 'orders' && subDocId && (data.status || data.fulfillment)) {
      previousDoc = await getDocument(path, req.tenantId || undefined);
    }
    await updateDocument(path, data, req.tenantId || '', allowNoTenant);
    if (businessId && subCol === 'orders' && subDocId && previousDoc) {
      const newStatus = (data.status as string) ?? (data.fulfillment as { status?: string })?.status;
      const prevStatus = (previousDoc.data.status as string) ?? (previousDoc.data.fulfillment as { status?: string })?.status;
      if (newStatus && newStatus !== prevStatus) {
        const items = ((previousDoc.data.items || data.items) as Array<{ productId?: string; quantity?: number; size?: string }>) || [];
        orderEvents.emit(ORDER_STATUS_CHANGED, {
          clientId: businessId,
          orderId: subDocId,
          previousStatus: prevStatus,
          newStatus,
          items: items
            .filter((i) => i.productId)
            .map((i) => ({ productId: i.productId!, quantity: i.quantity ?? 1, size: i.size })),
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, code: 'firestore/internal' });
  }
});

router.post('/add/*', async (req: Request, res: Response) => {
  const path = req.path.replace(/^\/add\/?/, '').replace(/^\//, '');
  const { data } = req.body as { data: Record<string, unknown> };
  if (!path || !data || !req.tenantId) {
    res.status(400).json({ error: 'Path and data required', code: 'firestore/invalid-argument' });
    return;
  }
  try {
    const result = await addDocument(path, data, req.tenantId);
    const { businessId, subCol } = parsePath(path);
    if (businessId && subCol === 'orders') {
      const items = (data.items as Array<{ productId?: string; quantity?: number; size?: string }>) || [];
      orderEvents.emit(ORDER_CREATED, {
        clientId: businessId,
        orderId: result.id,
        items: items
          .filter((i) => i.productId)
          .map((i) => ({ productId: i.productId!, quantity: i.quantity ?? 1, size: i.size })),
      });
    }
    res.json({ id: result.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, code: 'firestore/internal' });
  }
});

router.delete('/documents/*', async (req: Request, res: Response) => {
  const path = getPath(req);
  if (!path) {
    res.status(400).json({ error: 'Path required', code: 'firestore/invalid-path' });
    return;
  }
  try {
    await deleteDocument(path, req.tenantId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, code: 'firestore/internal' });
  }
});

export default router;
