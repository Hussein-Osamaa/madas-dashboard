import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  helperText?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options, helperText }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white appearance-none cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {helperText && <p className="text-xs text-gray-400">{helperText}</p>}
  </div>
);

export default SelectField;
