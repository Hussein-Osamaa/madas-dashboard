import React, { useRef } from 'react';

interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
}

const ImageField: React.FC<ImageFieldProps> = ({ label, value, onChange, placeholder, helperText }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const API_BASE = (import.meta.env.VITE_API_BACKEND_URL as string | undefined)?.replace(/\/api\/?$/, '') ?? '';
    const token = localStorage.getItem('backend_access_token') || localStorage.getItem('warehouse_access_token') || '';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as { url?: string };
        if (data.url) onChange(data.url);
      }
    } catch {
      // fallback: use object URL for preview
      onChange(URL.createObjectURL(file));
    }
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
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
      >
        <span className="material-icons text-sm">upload</span>
        Upload Image
      </button>
      {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
    </div>
  );
};

export default ImageField;
