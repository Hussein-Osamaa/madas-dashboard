import {
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  serverTimestamp
} from '../lib/firebase';

export interface AbandonedCartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
  image?: string | null;
}

export interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: AbandonedCartItem[];
  totalValue: number;
  createdAt: Date;
  lastActivity: Date;
  recoveryEmailSent?: boolean;
  recoveryAttempts: number;
  source?: 'website' | 'app' | 'pos';
  status: 'active' | 'recovered' | 'expired';
}

/**
 * Fetch all abandoned carts for a business.
 * Carts older than 7 days with status 'active' are auto-expired.
 */
export async function fetchAbandonedCarts(businessId: string): Promise<AbandonedCart[]> {
  const colRef = collection(db, 'businesses', businessId, 'abandonedCarts');
  const q = query(colRef, orderBy('lastActivity', 'desc'));
  const snapshot = await getDocs(q);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const carts: AbandonedCart[] = [];
  for (const docSnap of snapshot.docs) {
    const d = docSnap.data();
    const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : new Date());
    const lastActivity = d.lastActivity?.toDate ? d.lastActivity.toDate() : (d.lastActivity ? new Date(d.lastActivity) : new Date());

    let status: AbandonedCart['status'] = d.status || 'active';
    // Auto-expire old active carts
    if (status === 'active' && lastActivity < sevenDaysAgo) {
      status = 'expired';
      // Update in background
      updateDoc(doc(db, 'businesses', businessId, 'abandonedCarts', docSnap.id), { status: 'expired' }).catch(() => {});
    }

    carts.push({
      id: docSnap.id,
      customerName: d.customerName || 'Guest',
      customerEmail: d.customerEmail || null,
      customerPhone: d.customerPhone || null,
      items: (d.items || []).map((i: Record<string, unknown>) => ({
        productId: (i.productId as string) || (i.id as string) || '',
        name: (i.name as string) || '',
        quantity: (i.quantity as number) || 1,
        price: (i.price as number) || 0,
        size: (i.size as string) || null,
        color: (i.color as string) || null,
        image: (i.image as string) || null
      })),
      totalValue: d.totalValue || 0,
      createdAt,
      lastActivity,
      recoveryEmailSent: d.recoveryEmailSent || false,
      recoveryAttempts: d.recoveryAttempts || 0,
      source: d.source || 'website',
      status
    });
  }

  return carts;
}

/** Mark a cart as recovered (e.g. after converting to an order) */
export async function markCartRecovered(businessId: string, cartId: string): Promise<void> {
  const docRef = doc(db, 'businesses', businessId, 'abandonedCarts', cartId);
  await updateDoc(docRef, { status: 'recovered', updatedAt: serverTimestamp() });
}

/** Mark that a recovery email was sent */
export async function markRecoveryEmailSent(businessId: string, cartId: string): Promise<void> {
  const docRef = doc(db, 'businesses', businessId, 'abandonedCarts', cartId);
  const snap = await getDoc(docRef);
  const currentAttempts = snap.exists() ? (snap.data().recoveryAttempts || 0) : 0;
  await updateDoc(docRef, {
    recoveryEmailSent: true,
    recoveryAttempts: currentAttempts + 1,
    updatedAt: serverTimestamp()
  });
}

/** Delete a cart record */
export async function deleteAbandonedCart(businessId: string, cartId: string): Promise<void> {
  await deleteDoc(doc(db, 'businesses', businessId, 'abandonedCarts', cartId));
}
