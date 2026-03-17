import React from 'react';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  helperText?: string;
  disabled?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
  label, value, onChange, placeholder, multiline = false,
  rows = 3, maxLength, helperText, disabled = false,
}) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
      />
    )}
    <div className="flex justify-between">
      {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
      {maxLength && <p className="text-xs text-gray-400 ml-auto">{(value || '').length}/{maxLength}</p>}
    </div>
  </div>
);

export default TextField;
