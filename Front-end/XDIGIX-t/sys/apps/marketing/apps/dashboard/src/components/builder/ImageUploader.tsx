import { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../../contexts/BusinessContext';

/* ── Backend storage API ────────────────────────────────────────────────
   Replaces Firebase Storage — images go through POST /api/storage/upload
   which returns { url, storagePath }.  Falls back gracefully if env var
   is not set (dev environments that haven't configured the backend).
───────────────────────────────────────────────────────────────────────── */
const API_BASE = (import.meta.env.VITE_API_BACKEND_URL as string | undefined)
  ?.replace(/\/api\/?$/, '') ?? '';

function getToken(): string {
  return localStorage.getItem('backend_access_token')
    || localStorage.getItem('warehouse_access_token') || '';
}

type Props = {
  currentUrl?: string;
  onUpload?: (url: string) => void;
  // Alternative prop names for flexibility
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
};

const ImageUploader = ({ currentUrl, onUpload, value, onChange, label = 'Image', placeholder, className = '' }: Props) => {
  // Support both prop conventions
  const imageUrl = currentUrl || value || '';
  const handleUpload = onUpload || onChange;
  
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useBusiness(); // context available if needed later

  // Sync preview with prop changes
  useEffect(() => {
    setPreview(imageUrl || null);
  }, [imageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Show local preview immediately while uploading
      const reader = new FileReader();
      reader.onload = (e) => { setPreview(e.target?.result as string); };
      reader.readAsDataURL(file);

      // Upload to backend storage endpoint
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(msg.error || `Upload failed (${res.status})`);
      }

      const { url } = await res.json() as { url: string };
      setPreview(url);
      handleUpload?.(url);
    } catch (error) {
      console.error('[ImageUploader] Upload error:', error);
      alert('Failed to upload image. Please try again.');
      setPreview(imageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (handleUpload) {
      handleUpload('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-madas-text/80 mb-2">{label}</label>
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors disabled:opacity-60"
              title="Change image"
            >
              <span className="material-icons text-sm text-primary">edit</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors disabled:opacity-60"
              title="Remove image"
            >
              <span className="material-icons text-sm text-red-600">delete</span>
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <span className="material-icons animate-spin text-white text-2xl">progress_activity</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-gray-50"
        >
          {uploading ? (
            <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
          ) : (
            <>
              <span className="material-icons text-4xl text-madas-text/40 mb-2">cloud_upload</span>
              <p className="text-sm text-madas-text/60">Click to upload image</p>
              <p className="text-xs text-madas-text/50 mt-1">Max 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;

