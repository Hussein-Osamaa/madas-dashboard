import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from '../lib/firebase';

export type Product = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  sellingPrice?: number;
  sku?: string;
  lowStockAlert?: number;
  stock?: Record<string, number>;
  barcode?: string;
  sizeBarcodes?: Record<string, string>;
  stockByLocation?: Record<string, number>;
  subVariants?: Record<string, Array<{ name: string; stock: number; barcode?: string }>>;
  status?: string;
  storageLocation?: string;
  createdAt?: Date | string | { toDate?: () => Date };
  images?: string[];
};

type ProductPayload = Omit<Product, 'id'>;

type LegacySizeVariant = {
  barcode?: string;
  quantity?: number;
};

type LegacyLocationStock = {
  quantity?: number;
};

const productsCollection = (businessId: string) => collection(db, 'businesses', businessId, 'products');

const buildSizeVariants = (stock?: Record<string, number>, sizeBarcodes?: Record<string, string>) => {
  if (!stock) return {};
  const output: Record<string, LegacySizeVariant> = {};
  Object.entries(stock).forEach(([size, qty]) => {
    if (!size) return;
    const variant: LegacySizeVariant = {
      quantity: qty ?? 0
    };
    const barcode = sizeBarcodes?.[size];
    if (barcode && barcode.trim() !== '') {
      variant.barcode = barcode;
    }
    output[size] = variant;
  });
  return output;
};

const buildLocationLegacy = (stockByLocation?: Record<string, number>) => {
  if (!stockByLocation) return {};
  const output: Record<string, LegacyLocationStock> = {};
  Object.entries(stockByLocation).forEach(([locationId, qty]) => {
    if (!locationId) return;
    output[locationId] = {
      quantity: qty ?? 0
    };
  });
  return output;
};

export const fetchProducts = async (businessId: string): Promise<Product[]> => {
  const q = query(productsCollection(businessId), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const rawData = docSnap.data() as ProductPayload & {
      sizeVariants?: Record<string, LegacySizeVariant>;
      stockByLocation?: Record<string, number>;
      locationStock?: Record<string, LegacyLocationStock>;
    };

    let stock = rawData.stock ?? {};
    let sizeBarcodes = rawData.sizeBarcodes ?? {};
    let stockByLocation = rawData.stockByLocation ?? {};

    if ((!stock || Object.keys(stock).length === 0) && rawData.sizeVariants) {
      const convertedStock: Record<string, number> = {};
      const convertedBarcodes: Record<string, string> = {};
      Object.entries(rawData.sizeVariants).forEach(([size, variant]) => {
        if (!size) return;
        convertedStock[size] = Number(variant.quantity ?? 0);
        if (variant.barcode) {
          convertedBarcodes[size] = variant.barcode;
        }
      });
      stock = convertedStock;
      sizeBarcodes = { ...sizeBarcodes, ...convertedBarcodes };
    }

    if ((!stockByLocation || Object.keys(stockByLocation).length === 0) && rawData.locationStock) {
      const convertedLocations: Record<string, number> = {};
      Object.entries(rawData.locationStock).forEach(([locationId, location]) => {
        convertedLocations[locationId] = Number(location.quantity ?? 0);
      });
      stockByLocation = convertedLocations;
    }

    const subVariants = rawData.subVariants ?? {};

    const data: ProductPayload = {
      ...rawData,
      stock,
      sizeBarcodes,
      stockByLocation,
      subVariants: Object.keys(subVariants).length > 0 ? subVariants : undefined
    };

    return {
      id: docSnap.id,
      ...data
    };
  });
};

export const createProduct = async (businessId: string, payload: ProductPayload) => {
  // Filter out undefined values to prevent Firebase errors
  const cleanPayload: Record<string, any> = {};
  
  // Copy only defined values from payload
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanPayload[key] = value;
    }
  });
  
  // Add computed fields only if source data exists
  if (payload.stockByLocation !== undefined) {
    cleanPayload.stockByLocation = payload.stockByLocation;
    cleanPayload.locationStock = buildLocationLegacy(payload.stockByLocation);
  }
  
  if (payload.stock) {
    cleanPayload.sizeVariants = buildSizeVariants(payload.stock, payload.sizeBarcodes);
  }
  if (payload.subVariants && Object.keys(payload.subVariants).length > 0) {
    cleanPayload.subVariants = payload.subVariants;
  }

  // Always add timestamps
  cleanPayload.createdAt = serverTimestamp();
  cleanPayload.updatedAt = serverTimestamp();

  await addDoc(productsCollection(businessId), cleanPayload);
};

export const updateProduct = async (businessId: string, productId: string, payload: Partial<ProductPayload>) => {
  const productRef = doc(db, 'businesses', businessId, 'products', productId);
  
  // Filter out undefined values
  const cleanPayload: Record<string, any> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanPayload[key] = value;
    }
  });
  
  // Add computed fields only if source data exists
  if (payload.stockByLocation !== undefined) {
    cleanPayload.stockByLocation = payload.stockByLocation;
    cleanPayload.locationStock = buildLocationLegacy(payload.stockByLocation);
  }
  
  if (payload.stock) {
    cleanPayload.sizeVariants = buildSizeVariants(payload.stock, payload.sizeBarcodes);
  }
  if (payload.subVariants !== undefined) {
    cleanPayload.subVariants = payload.subVariants;
  }

  cleanPayload.updatedAt = serverTimestamp();

  await updateDoc(productRef, cleanPayload);
};

export const deleteProduct = async (businessId: string, productId: string) => {
  const productRef = doc(db, 'businesses', businessId, 'products', productId);
  await deleteDoc(productRef);
};

// Decrease stock when an order is placed
export const decreaseProductStock = async (
  businessId: string,
  productId: string,
  size: string | undefined,
  quantity: number
) => {
  const productRef = doc(db, 'businesses', businessId, 'products', productId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    console.error(`[productsService] Product ${productId} not found`);
    return;
  }
  
  const productData = productSnap.data();
  const stock = productData.stock ?? {};
  const sizeKey = size || 'default';
  
  const currentStock = stock[sizeKey] ?? 0;
  const newStock = Math.max(0, currentStock - quantity);
  
  const updatedStock = { ...stock, [sizeKey]: newStock };
  
  await updateDoc(productRef, {
    stock: updatedStock,
    sizeVariants: buildSizeVariants(updatedStock, productData.sizeBarcodes ?? {}),
    updatedAt: serverTimestamp()
  });
  
  console.log(`[productsService] Decreased stock for ${productId} (${sizeKey}): ${currentStock} -> ${newStock}`);
};

// Restore stock when an order is cancelled
export const restoreProductStock = async (
  businessId: string,
  productId: string,
  size: string | undefined,
  quantity: number
) => {
  const productRef = doc(db, 'businesses', businessId, 'products', productId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    console.error(`[productsService] Product ${productId} not found`);
    return;
  }
  
  const productData = productSnap.data();
  const stock = productData.stock ?? {};
  const sizeKey = size || 'default';
  
  const currentStock = stock[sizeKey] ?? 0;
  const newStock = currentStock + quantity;
  
  const updatedStock = { ...stock, [sizeKey]: newStock };
  
  await updateDoc(productRef, {
    stock: updatedStock,
    sizeVariants: buildSizeVariants(updatedStock, productData.sizeBarcodes ?? {}),
    updatedAt: serverTimestamp()
  });
  
  console.log(`[productsService] Restored stock for ${productId} (${sizeKey}): ${currentStock} -> ${newStock}`);
};
