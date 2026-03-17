import React from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSlider?: boolean;
}

const NumberField: React.FC<NumberFieldProps> = ({
  label, value, onChange, min = 0, max = 100, step = 1, unit, showSlider = false,
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <span className="text-xs text-gray-500 font-mono">{value}{unit}</span>
    </div>
    {showSlider ? (
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
        />
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="w-16 px-2 py-1 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
      </div>
    ) : (
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
      />
    )}
  </div>
);

export default NumberField;
