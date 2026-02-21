import { useEffect, useState, useRef } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';
import { storage, ref, uploadBytes, getDownloadURL } from '../../lib/firebase';
import { Product } from '../../services/productsService';

export type XdfImagePricingPayload = {
  images: string[];
  price: number;
  sellingPrice: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (payload: XdfImagePricingPayload) => Promise<void>;
  submitting?: boolean;
};

const XdfImagePricingModal = ({ open, onClose, product, onSubmit, submitting = false }: Props) => {
  const { businessId } = useBusiness();
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !product) return;
    setImages(product.images ?? []);
    setPrice(product.price ?? 0);
    setSellingPrice(product.sellingPrice ?? product.price ?? 0);
  }, [open, product]);

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
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `businesses/${businessId}/products/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setImages((prev) => [...prev, downloadURL]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) uploadImage(files[i]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ images, price, sellingPrice });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-card border border-gray-100 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-primary">Edit image & pricing</h2>
            <p className="text-sm text-madas-text/70">
              {product?.name ?? 'Linked product'} – only image, price and selling price can be edited.
            </p>
          </div>
          <button type="button" className="p-2 rounded-full hover:bg-base text-madas-text/60" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <section>
            <h3 className="text-sm font-semibold text-primary mb-2">Product image</h3>
            {images.length === 0 ? (
              <div
                onClick={() => imageInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-200 bg-base/60 hover:border-primary'
                }`}
              >
                {uploadingImage ? (
                  <>
                    <span className="material-icons animate-spin text-4xl text-primary mb-2">progress_activity</span>
                    <p className="text-sm text-primary font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <span className="material-icons text-4xl text-madas-text/30 mb-2">add_photo_alternate</span>
                    <p className="text-sm text-madas-text/60">Drag & drop or click to add image</p>
                    <p className="text-xs text-orange-500 mt-1 font-medium">Max 500KB</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                    {index === 0 && (
                      <span className="absolute top-1 left-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 bg-white rounded shadow hover:bg-red-50"
                      title="Remove"
                    >
                      <span className="material-icons text-xs text-red-500">close</span>
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging ? 'border-primary bg-primary/10' : 'border-gray-200 bg-base/60 hover:border-primary'
                  }`}
                >
                  {uploadingImage ? (
                    <span className="material-icons animate-spin text-2xl text-primary">progress_activity</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-madas-text/80">
              Selling price
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default XdfImagePricingModal;
