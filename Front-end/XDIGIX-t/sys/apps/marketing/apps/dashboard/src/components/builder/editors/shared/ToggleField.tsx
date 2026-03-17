import React from 'react';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  helperText?: string;
}

const ToggleField: React.FC<ToggleFieldProps> = ({ label, value, onChange, helperText }) => (
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
      {helperText && <p className="text-xs text-gray-400 mt-0.5">{helperText}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
        value ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default ToggleField;
