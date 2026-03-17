import React, { useRef } from 'react';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowGradient?: boolean;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, allowGradient = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isGradient = value?.startsWith('linear-gradient') || value?.startsWith('radial-gradient');
  const displayColor = isGradient ? '#667eea' : (value || '#000000');

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0 shadow-sm overflow-hidden"
          style={{ background: value || '#000000' }}
          onClick={() => inputRef.current?.click()}
        />
        <input
          ref={inputRef}
          type="color"
          value={isGradient ? '#667eea' : displayColor}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
        />
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={allowGradient ? '#hex or linear-gradient(...)' : '#hex or rgb(...)'}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white font-mono"
        />
      </div>
    </div>
  );
};

export default ColorField;
