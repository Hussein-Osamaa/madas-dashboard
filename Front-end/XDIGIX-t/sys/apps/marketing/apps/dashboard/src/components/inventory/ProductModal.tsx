import { useEffect, useMemo, useState, useRef } from 'react';
import { Warehouse } from '../../hooks/useWarehouses';
import { Product } from '../../services/productsService';
import { useBusiness } from '../../contexts/BusinessContext';
import { storage, ref, uploadBytes, getDownloadURL } from '../../lib/firebase';

type SubVariant = {
  id: string;
  name: string;
  stock: number;
  barcode: string;
};

type SizeVariant = {
  id: string;
  size: string;
  stock: number;
  barcode: string;
  subVariants?: SubVariant[];
};

const makeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const generateBarcode = () =>
  `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

const generateNumericBarcode = () => {
  // Generate a 12-digit numeric barcode (EAN-13 compatible format, but numbers only)
  // Using timestamp + random numbers for uniqueness
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 4 random digits
  return `${timestamp}${random}`;
};

export type ProductDraft = Omit<Product, 'id'> & { id?: string; subVariants?: Record<string, Array<{ name: string; stock: number; barcode?: string }>> };

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ProductDraft) => Promise<void>;
  initialValue?: Product | null;
  submitting?: boolean;
  warehouses: Warehouse[];
};

const emptyDraft: ProductDraft = {
  name: '',
  description: '',
  price: 0,
  sellingPrice: 0,
  sku: '',
  lowStockAlert: 10,
  stock: {},
  barcode: '',
  sizeBarcodes: {},
  stockByLocation: {},
  images: []
};

const ProductModal = ({ open, onClose, onSubmit, initialValue, submitting, warehouses }: Props) => {
  const initialDraft = useMemo(() => {
    if (!initialValue) return emptyDraft;
    return {
      id: initialValue.id,
      name: initialValue.name ?? '',
      description: initialValue.description ?? '',
      price: initialValue.price ?? 0,
      sellingPrice: initialValue.sellingPrice ?? 0,
      sku: initialValue.sku ?? '',
      lowStockAlert: initialValue.lowStockAlert ?? 10,
      stock: initialValue.stock ?? {},
      barcode: initialValue.barcode ?? '',
      sizeBarcodes: initialValue.sizeBarcodes ?? {},
      stockByLocation: initialValue.stockByLocation ?? {},
      subVariants: initialValue.subVariants ?? {},
      images: initialValue.images ?? []
    };
  }, [initialValue]);

  const [draft, setDraft] = useState<ProductDraft>(initialDraft);
  const [variants, setVariants] = useState<SizeVariant[]>([]);
  const [mainBarcode, setMainBarcode] = useState(initialDraft.barcode || generateBarcode());
  const [locationStock, setLocationStock] = useState<Record<string, number>>(initialDraft.stockByLocation ?? {});
  const [images, setImages] = useState<string[]>(initialDraft.images ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { businessId } = useBusiness();

  // Reset form when modal opens or initialDraft changes
  useEffect(() => {
    if (!open) return; // Only reset when modal is opening
    
    setDraft(initialDraft);
    const resolvedMain = initialDraft.barcode && initialDraft.barcode.length > 0 ? initialDraft.barcode : generateBarcode();
    setMainBarcode(resolvedMain);
    setLocationStock(initialDraft.stockByLocation ?? {});
    setImages(initialDraft.images ?? []);

    const sizeBarcodes = initialDraft.sizeBarcodes ?? {};
    const subVariantsFromProduct = initialDraft.subVariants ?? {};
    const stockEntries = Object.entries(initialDraft.stock ?? {});

    const subVariantParentKeys = new Set(Object.keys(subVariantsFromProduct));
    // Flat stock entries: keys without '|' and not already a sub-variant parent
    const flatStockEntries = stockEntries.filter(([k]) => !k.includes('|') && !subVariantParentKeys.has(k));

    if (subVariantParentKeys.size > 0 || flatStockEntries.length > 0) {
      const variantsWithSubs: SizeVariant[] = Object.entries(subVariantsFromProduct).map(([parentSize, subs]) => ({
        id: makeId(),
        size: parentSize,
        stock: subs.reduce((a, s) => a + s.stock, 0),
        barcode: sizeBarcodes[parentSize] ?? (parentSize ? `${resolvedMain}-${parentSize}` : ''),
        subVariants: subs.map((s) => ({
          id: makeId(),
          name: s.name,
          stock: s.stock,
          barcode: s.barcode ?? (parentSize ? `${resolvedMain}-${parentSize}-${s.name}` : '')
        }))
      }));
      const variantsWithoutSubs: SizeVariant[] = flatStockEntries.map(([size, stock]) => ({
        id: makeId(),
        size,
        stock,
        barcode: sizeBarcodes[size] ?? (size ? `${resolvedMain}-${size}` : '')
      }));
      setVariants([...variantsWithSubs, ...variantsWithoutSubs]);
    } else if (stockEntries.length === 0) {
      setVariants([{ id: makeId(), size: '', stock: 0, barcode: '' }]);
    } else {
      setVariants(
        stockEntries
          .filter(([k]) => !k.includes('|'))
          .map(([size, stock]) => ({
            id: makeId(),
            size,
            stock,
            barcode: sizeBarcodes[size] ?? (size ? `${resolvedMain}-${size}` : '')
          }))
      );
    }
  }, [open, initialDraft]);

  const updateMainBarcodeValue = (value: string) => {
    const nextValue = value.trim();
    setMainBarcode((prevMain) => {
      setVariants((prevVariants) =>
        prevVariants.map((variant) => {
          if (!variant.size) {
            return { ...variant, barcode: nextValue ? variant.barcode : '' };
          }
          const hadPrevPrefix =
            !!prevMain && prevMain.length > 0 && variant.barcode?.startsWith(`${prevMain}-`);
          const shouldReplace = !variant.barcode || variant.barcode === '' || hadPrevPrefix;

          if (!nextValue) {
            return shouldReplace ? { ...variant, barcode: '' } : variant;
          }

          if (shouldReplace) {
            return { ...variant, barcode: `${nextValue}-${variant.size}` };
          }

          return variant;
        })
      );
      return nextValue;
    });
  };

  const handleGenerateMainBarcode = () => {
    updateMainBarcodeValue(generateBarcode());
  };

  const handleGenerateNumericBarcode = () => {
    updateMainBarcodeValue(generateNumericBarcode());
  };

  const handleVariantChange = (id: string, field: 'size' | 'stock' | 'barcode', value: string) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (variant.id !== id) return variant;
        if (field === 'size') {
          const nextSize = value;
          const hasPrefix =
            !!mainBarcode && mainBarcode.length > 0 && variant.barcode?.startsWith(`${mainBarcode}-`);
          const shouldReplace = !variant.barcode || variant.barcode === '' || hasPrefix;
          let nextBarcode = variant.barcode ?? '';
          if (!nextSize && shouldReplace) {
            nextBarcode = '';
          } else if (nextSize && shouldReplace && mainBarcode) {
            nextBarcode = `${mainBarcode}-${nextSize}`;
          }
          return { ...variant, size: nextSize, barcode: nextBarcode };
        }
        if (field === 'stock') {
          return { ...variant, stock: Number(value) || 0 };
        }
        return { ...variant, barcode: value };
      })
    );
  };

  const handleAddVariant = () => {
    setVariants((prev) => {
      const suffix = prev.length + 1;
      return [
        ...prev,
        {
          id: makeId(),
          size: '',
          stock: 0,
          barcode: mainBarcode ? `${mainBarcode}-VAR${suffix}` : ''
        }
      ];
    });
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((variant) => variant.id !== id));
  };

  const handleAddSubVariant = (variantId: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const subs = v.subVariants ?? [];
        return {
          ...v,
          subVariants: [
            ...subs,
            {
              id: makeId(),
              name: '',
              stock: 0,
              barcode: mainBarcode && v.size ? `${mainBarcode}-${v.size}-SUB${subs.length + 1}` : ''
            }
          ]
        };
      })
    );
  };

  const handleSubVariantChange = (variantId: string, subId: string, field: 'name' | 'stock' | 'barcode', value: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId || !v.subVariants) return v;
        return {
          ...v,
          subVariants: v.subVariants.map((s) => {
            if (s.id !== subId) return s;
            if (field === 'name') return { ...s, name: value };
            if (field === 'stock') return { ...s, stock: Number(value) || 0 };
            return { ...s, barcode: value };
          })
        };
      })
    );
  };

  const handleRemoveSubVariant = (variantId: string, subId: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const next = (v.subVariants ?? []).filter((s) => s.id !== subId);
        return { ...v, subVariants: next.length > 0 ? next : undefined };
      })
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const stock: Record<string, number> = {};
    const sizeBarcodes: Record<string, string> = {};
    const subVariants: Record<string, Array<{ name: string; stock: number; barcode?: string }>> = {};

    variants.forEach((variant) => {
      if (!variant.size) return;
      const fallback =
        mainBarcode && mainBarcode.length > 0 && variant.size
          ? `${mainBarcode}-${variant.size}`
          : generateBarcode();
      const variantBarcode = variant.barcode && variant.barcode.length > 0 ? variant.barcode : fallback;

      if (variant.subVariants && variant.subVariants.length > 0) {
        subVariants[variant.size] = variant.subVariants
          .filter((s) => s.name.trim() !== '')
          .map((s) => ({
            name: s.name.trim(),
            stock: s.stock,
            barcode: s.barcode && s.barcode.length > 0 ? s.barcode : undefined
          }));
        variant.subVariants.forEach((s) => {
          if (s.name.trim()) {
            const key = `${variant.size}|${s.name.trim()}`;
            stock[key] = s.stock;
            const subBarcode = s.barcode && s.barcode.trim() ? s.barcode : `${mainBarcode}-${variant.size}-${s.name}`;
            sizeBarcodes[key] = subBarcode;
          }
        });
      } else {
        stock[variant.size] = variant.stock;
        sizeBarcodes[variant.size] = variantBarcode;
      }
    });

    const resolvedMain = mainBarcode && mainBarcode.length > 0 ? mainBarcode : generateBarcode();
    if (!mainBarcode || mainBarcode.length === 0) {
      setMainBarcode(resolvedMain);
    }

    const stockByLocationEntries = Object.entries(locationStock).filter(([, quantity]) => quantity > 0);
    const stockByLocation = Object.fromEntries(stockByLocationEntries);

    const payload: ProductDraft = {
      ...draft,
      stock,
      barcode: resolvedMain,
      sizeBarcodes,
      stockByLocation,
      images
    };
    if (Object.keys(subVariants).length > 0) {
      payload.subVariants = subVariants;
    }

    await onSubmit(payload);
  };

  const handleLocationChange = (locationId: string, value: string) => {
    const quantity = Number(value);
    setLocationStock((prev) => ({
      ...prev,
      [locationId]: Number.isNaN(quantity) ? 0 : quantity
    }));
  };

  const handleClearLocation = (locationId: string) => {
    setLocationStock((prev) => {
      const next = { ...prev };
      delete next[locationId];
      return next;
    });
  };

  const uploadImage = async (file: File) => {
    if (!businessId) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 500 * 1024) {
      alert('Image size must be less than 500KB. Please compress your image.');
      return;
    }

    setUploadingImage(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `businesses/${businessId}/products/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setImages((prev) => [...prev, downloadURL]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await uploadImage(files[i]);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const newImages = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newImages.length) return prev;
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      return newImages;
    });
  };

  const allLocations = useMemo(() => {
    const knownIds = new Set(warehouses.map((warehouse) => warehouse.id));
    const combined = warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code
    }));

    Object.keys(locationStock).forEach((locationId) => {
      if (!knownIds.has(locationId)) {
        combined.push({
          id: locationId,
          name: `Archived Warehouse (${locationId})`,
          code: undefined
        });
      }
    });

    return combined;
  }, [warehouses, locationStock]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-card border border-gray-100">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-primary">{draft.id ? 'Edit Product' : 'Add Product'}</h2>
            <p className="text-sm text-madas-text/70">
              {draft.id ? 'Update product details and stock levels' : 'Create a new product with size tracking'}
            </p>
          </div>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-base transition-colors text-madas-text/60"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Name
              <input
                type="text"
                required
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Product name"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              SKU
              <input
                type="text"
                value={draft.sku ?? ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, sku: event.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="SKU"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={draft.price}
                onChange={(event) => setDraft((prev) => ({ ...prev, price: Number(event.target.value) || 0 }))}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Selling Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.sellingPrice ?? 0}
                onChange={(event) => setDraft((prev) => ({ ...prev, sellingPrice: Number(event.target.value) || 0 }))}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Low Stock Alert
              <input
                type="number"
                min="0"
                value={draft.lowStockAlert ?? 0}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, lowStockAlert: Number(event.target.value) || 0 }))
                }
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="10"
              />
            </label>
          <label className="md:col-span-2 flex flex-col gap-2 text-sm text-madas-text/80">
            Primary Barcode
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={mainBarcode}
                onChange={(event) => updateMainBarcodeValue(event.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Automatically generated"
              />
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
                onClick={handleGenerateMainBarcode}
                title="Generate alphanumeric barcode"
              >
                <span className="material-icons text-base">autorenew</span>
                Generate
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
                onClick={handleGenerateNumericBarcode}
                title="Generate numbers-only barcode for mobile scanning"
              >
                <span className="material-icons text-base">qr_code_scanner</span>
                Generate (Phone)
              </button>
            </div>
            <span className="text-xs text-madas-text/60">
              Used as the base for size variant barcodes. Leave blank to auto-generate.
            </span>
          </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-madas-text/80">
            Description
            <textarea
              value={draft.description ?? ''}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-[120px] rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Add a description"
            />
          </label>

          {/* Product Images Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">Product Images</h3>
                <p className="text-xs text-madas-text/60">Add images to showcase your product. First image will be the main image. <span className="text-orange-500 font-medium">Max 500KB per image.</span></p>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-primary hover:bg-base transition-colors disabled:opacity-60"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <>
                    <span className="material-icons animate-spin text-sm">progress_activity</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm">add_photo_alternate</span>
                    Add Image
                  </>
                )}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {images.length === 0 ? (
              <div 
                onClick={() => imageInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ${
                  isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-gray-200 bg-base/60 hover:border-primary'
                }`}
              >
                {uploadingImage ? (
                  <>
                    <span className="material-icons animate-spin text-4xl text-primary mb-2">progress_activity</span>
                    <p className="text-sm text-primary font-medium">Uploading...</p>
                  </>
                ) : isDragging ? (
                  <>
                    <span className="material-icons text-4xl text-primary mb-2">file_download</span>
                    <p className="text-sm text-primary font-medium">Drop your image here</p>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-4xl text-madas-text/30 mb-2">add_photo_alternate</span>
                    <p className="text-sm text-madas-text/60">Drag & drop or click to upload</p>
                    <p className="text-xs text-orange-500 mt-1 font-medium">Max 500KB per image</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img 
                        src={imageUrl} 
                        alt={`Product ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {index === 0 && (
                      <span className="absolute top-1 left-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Main
                      </span>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, 'up')}
                          className="p-1 bg-white rounded shadow hover:bg-gray-50"
                          title="Move left"
                        >
                          <span className="material-icons text-xs text-madas-text/70">arrow_back</span>
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, 'down')}
                          className="p-1 bg-white rounded shadow hover:bg-gray-50"
                          title="Move right"
                        >
                          <span className="material-icons text-xs text-madas-text/70">arrow_forward</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="p-1 bg-white rounded shadow hover:bg-red-50"
                        title="Remove image"
                      >
                        <span className="material-icons text-xs text-red-500">close</span>
                      </button>
                    </div>
                  </div>
                ))}
                {/* Add more button with drag & drop */}
                <div 
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-primary bg-primary/10 scale-105' 
                      : 'border-gray-200 bg-base/60 hover:border-primary'
                  }`}
                >
                  {uploadingImage ? (
                    <span className="material-icons animate-spin text-2xl text-primary">progress_activity</span>
                  ) : isDragging ? (
                    <span className="material-icons text-2xl text-primary">file_download</span>
                  ) : (
                    <>
                      <span className="material-icons text-2xl text-madas-text/30">add</span>
                      <span className="text-xs text-madas-text/50 mt-1">Add more</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">Size Variants</h3>
                <p className="text-xs text-madas-text/60">Track stock levels across sizes or variants.</p>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-primary hover:bg-base transition-colors"
                onClick={handleAddVariant}
              >
                <span className="material-icons text-sm">add</span>
                Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {variants.map((variant) => {
                const hasSubs = variant.subVariants && variant.subVariants.length > 0;
                const subTotal = hasSubs ? variant.subVariants!.reduce((a, s) => a + s.stock, 0) : 0;
                return (
                <div key={variant.id} className="rounded-xl border border-gray-100 overflow-hidden bg-base/60">
                  {/* Parent variant row */}
                  <div className="flex flex-col gap-1 px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-3 items-center">
                      <input
                        type="text"
                        value={variant.size}
                        onChange={(event) => handleVariantChange(variant.id, 'size', event.target.value)}
                        placeholder="Variant (e.g. Blue, M, Default)"
                        className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={hasSubs ? subTotal : variant.stock}
                          onChange={(event) => handleVariantChange(variant.id, 'stock', event.target.value)}
                          placeholder="Stock"
                          disabled={!!hasSubs}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-sm disabled:opacity-60 disabled:bg-gray-50"
                        />
                        {hasSubs && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-madas-text/40 pointer-events-none">from subs</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={variant.barcode}
                        onChange={(event) => handleVariantChange(variant.id, 'barcode', event.target.value)}
                        placeholder={
                          variant.size && mainBarcode ? `${mainBarcode}-${variant.size}` : 'Barcode'
                        }
                        disabled={!!hasSubs}
                        className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent text-sm disabled:opacity-60 disabled:bg-gray-50"
                      />
                      <button
                        type="button"
                        className="text-sm text-red-500 hover:text-red-600 justify-self-end"
                        onClick={() => handleRemoveVariant(variant.id)}
                      >
                        Remove
                      </button>
                    </div>
                    {/* Add sub-variant button - always visible under the variant */}
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors self-start mt-0.5"
                      onClick={() => handleAddSubVariant(variant.id)}
                    >
                      <span className="material-icons" style={{ fontSize: '14px' }}>add</span>
                      Add Sub Size
                    </button>
                  </div>

                  {/* Sub-variants list - only shown when sub-variants exist */}
                  {hasSubs && (
                    <div className="border-t border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-madas-text/50 uppercase tracking-wide flex items-center gap-1">
                          <span className="material-icons" style={{ fontSize: '13px' }}>subdirectory_arrow_right</span>
                          Sub Sizes ({variant.subVariants!.length})
                        </p>
                      </div>
                      {variant.subVariants!.map((sub) => (
                        <div
                          key={sub.id}
                          className="grid grid-cols-[1fr,70px,1fr,auto] gap-2 items-center pl-4"
                        >
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => handleSubVariantChange(variant.id, sub.id, 'name', e.target.value)}
                            placeholder="e.g. S, M, L"
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <input
                            type="number"
                            min="0"
                            value={sub.stock}
                            onChange={(e) => handleSubVariantChange(variant.id, sub.id, 'stock', e.target.value)}
                            placeholder="0"
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <input
                            type="text"
                            value={sub.barcode}
                            onChange={(e) => handleSubVariantChange(variant.id, sub.id, 'barcode', e.target.value)}
                            placeholder="Barcode"
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:text-red-600 px-1"
                            onClick={() => handleRemoveSubVariant(variant.id, sub.id)}
                          >
                            <span className="material-icons" style={{ fontSize: '16px' }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">Warehouse Stock</h3>
                <p className="text-xs text-madas-text/60">Track quantities across storage locations.</p>
              </div>
              <span className="text-xs text-madas-text/50">
                Total:{' '}
                {Object.values(locationStock).reduce(
                  (acc, qty) => acc + (Number.isFinite(qty) ? qty : 0),
                  0
                )}{' '}
                units
              </span>
            </div>

            {allLocations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-base/60 px-4 py-3 text-xs text-madas-text/70">
                No warehouses found. Add warehouses to allocate stock across locations.
              </div>
            ) : (
              <div className="space-y-3">
                {allLocations.map((location) => {
                  const value = locationStock[location.id] ?? 0;
                  return (
                    <div
                      key={location.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-base/60 px-4 py-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">{location.name || 'Warehouse'}</p>
                        {location.code ? (
                          <p className="text-xs text-madas-text/60">Code: {location.code}</p>
                        ) : null}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(event) => handleLocationChange(location.id, event.target.value)}
                        className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <button
                        type="button"
                        className="text-xs text-madas-text/50 hover:text-red-500"
                        onClick={() => handleClearLocation(location.id)}
                        title="Clear quantity"
                      >
                        Clear
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <span className="material-icons animate-spin text-base">progress_activity</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-icons text-base">{draft.id ? 'save' : 'add'}</span>
                  {draft.id ? 'Save Changes' : 'Create Product'}
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;

