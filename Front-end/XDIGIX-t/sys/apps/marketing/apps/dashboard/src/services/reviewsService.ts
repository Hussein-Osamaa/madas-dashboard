import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from '../lib/firebase';

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export type Review = {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail?: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  status: ReviewStatus;
  helpfulCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  reply?: string;
  repliedAt?: Date;
};

export type ReviewDraft = Omit<Review, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type FirestoreReview = Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'repliedAt'> & {
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
  repliedAt?: { toDate: () => Date };
};

const reviewsCollection = (businessId: string) => collection(db, 'businesses', businessId, 'reviews');

const normalizeDate = (value: FirestoreReview['createdAt']): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && 'toDate' in value) return value.toDate();
  return undefined;
};

export const fetchReviews = async (businessId: string): Promise<Review[]> => {
  const reviewsRef = reviewsCollection(businessId);
  const reviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(reviewsQuery);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as FirestoreReview;
    return {
      id: docSnap.id,
      productId: data.productId ?? '',
      productName: data.productName ?? '',
      customerName: data.customerName ?? '',
      customerEmail: data.customerEmail,
      rating: data.rating ?? 0,
      title: data.title,
      comment: data.comment ?? '',
      status: (data.status as ReviewStatus) ?? 'pending',
      helpfulCount: data.helpfulCount ?? 0,
      createdAt: normalizeDate(data.createdAt),
      updatedAt: normalizeDate(data.updatedAt),
      reply: data.reply,
      repliedAt: data.repliedAt ? normalizeDate(data.repliedAt) : undefined
    };
  });
};

export const createReview = async (businessId: string, payload: Omit<ReviewDraft, 'id'>) => {
  await addDoc(reviewsCollection(businessId), {
    ...payload,
    helpfulCount: payload.helpfulCount ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateReview = async (businessId: string, reviewId: string, payload: Partial<ReviewDraft>) => {
  const reviewRef = doc(db, 'businesses', businessId, 'reviews', reviewId);
  await updateDoc(reviewRef, {
    ...payload,
    updatedAt: serverTimestamp(),
    ...(payload.reply ? { repliedAt: serverTimestamp() } : {})
  });
};

export const deleteReview = async (businessId: string, reviewId: string) => {
  const reviewRef = doc(db, 'businesses', businessId, 'reviews', reviewId);
  await deleteDoc(reviewRef);
};

export const fetchReviewsByProduct = async (businessId: string, productId: string): Promise<Review[]> => {
  const reviewsRef = reviewsCollection(businessId);
  const reviewsQuery = query(reviewsRef, where('productId', '==', productId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(reviewsQuery);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as FirestoreReview;
    return {
      id: docSnap.id,
      productId: data.productId ?? '',
      productName: data.productName ?? '',
      customerName: data.customerName ?? '',
      customerEmail: data.customerEmail,
      rating: data.rating ?? 0,
      title: data.title,
      comment: data.comment ?? '',
      status: (data.status as ReviewStatus) ?? 'pending',
      helpfulCount: data.helpfulCount ?? 0,
      createdAt: normalizeDate(data.createdAt),
      updatedAt: normalizeDate(data.updatedAt),
      reply: data.reply,
      repliedAt: data.repliedAt ? normalizeDate(data.repliedAt) : undefined
    };
  });
};

