import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { DividerSectionData } from '../../../types/builder';
import ColorField from './shared/ColorField';
import NumberField from './shared/NumberField';
import SelectField from './shared/SelectField';
import StylePanel from './shared/StylePanel';

const styleOptions = [
  { value: 'line',     label: 'Solid Line' },
  { value: 'dotted',   label: 'Dotted' },
  { value: 'dashed',   label: 'Dashed' },
  { value: 'gradient', label: 'Gradient Fade' },
  { value: 'wave',     label: 'Wave' },
  { value: 'zigzag',   label: 'Zigzag' },
];

const DividerEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<DividerSectionData>(section.data as DividerSectionData);
  useEffect(() => { setData(section.data as DividerSectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Divider Style</p>
        <SelectField label="Style" value={data.style || 'line'} onChange={v => set('style', v)} options={styleOptions} />
        <ColorField label="Color" value={data.color || '#e5e7eb'} onChange={v => set('color', v)} />
        <NumberField label="Thickness" value={data.height ?? 1} onChange={v => set('height', v)} min={1} max={20} unit="px" showSlider />
        <NumberField label="Vertical Spacing" value={data.spacing ?? 40} onChange={v => set('spacing', v)} min={0} max={120} unit="px" showSlider />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(DividerEditor);
