import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
}

interface MediaFile {
  url: string;
  path: string;
  size: number;
  lastModified?: string;
}

const API_BASE = () => (import.meta.env.VITE_API_BACKEND_URL as string | undefined)?.replace(/\/api\/?$/, '') ?? '';
const getToken = () => localStorage.getItem('backend_access_token') || localStorage.getItem('warehouse_access_token') || '';

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ── Media Library Popup ─────────────────────────────────────────── */
const MediaLibrary: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  onUpload: () => void;
}> = ({ open, onClose, onSelect, onUpload }) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE()}/api/storage/list`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json() as { files: MediaFile[] };
        setFiles(data.files || []);
      } else {
        setError('Failed to load media library');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchFiles();
  }, [open, fetchFiles]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="material-icons text-lg text-gray-600">photo_library</span>
            <h3 className="text-sm font-semibold text-gray-800">Media Library</h3>
            <span className="text-xs text-gray-400">({files.length} images)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-icons text-sm">upload</span>
              Upload New
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="material-icons text-lg text-gray-500">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-gray-500">Loading images...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <span className="material-icons text-3xl text-red-400 mb-2">error_outline</span>
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={fetchFiles} className="mt-2 text-xs text-primary underline">Retry</button>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="text-center py-16">
              <span className="material-icons text-4xl text-gray-300 mb-3">collections</span>
              <p className="text-sm text-gray-500 mb-1">No images uploaded yet</p>
              <p className="text-xs text-gray-400">Upload your first image to get started</p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {files.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => { onSelect(file.url); onClose(); }}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-gray-100"
                >
                  <img
                    src={file.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                    <div className="w-full px-2 py-1.5 bg-black/60 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity truncate">
                      {formatSize(file.size)}
                    </div>
                  </div>
                  {/* Selection indicator */}
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons text-xs">check</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── ImageField Component ────────────────────────────────────────── */
const ImageField: React.FC<ImageFieldProps> = ({ label, value, onChange, placeholder, helperText }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE()}/api/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as { url?: string };
        if (data.url) onChange(data.url);
      }
    } catch {
      onChange(URL.createObjectURL(file));
    }
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {value && (
        <div className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          <img src={value} alt="preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
          >
            <span className="material-icons text-xs">close</span>
          </button>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'https://...'}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
      />
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <span className="material-icons text-sm">upload</span>
          Upload
        </button>
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="material-icons text-sm">photo_library</span>
          Library
        </button>
      </div>
      {helperText && <p className="text-xs text-gray-400">{helperText}</p>}

      <MediaLibrary
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={(url) => onChange(url)}
        onUpload={() => { setShowLibrary(false); fileRef.current?.click(); }}
      />
    </div>
  );
};

export default ImageField;
