import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { CTASectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import StylePanel from './shared/StylePanel';

const CTAEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<CTASectionData>(section.data as CTASectionData);
  useEffect(() => { setData(section.data as CTASectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <TextField label="Title" value={data.title || ''} onChange={v => set('title', v)} maxLength={80} />
        <TextField label="Subtitle" value={data.subtitle || ''} onChange={v => set('subtitle', v)} multiline rows={2} />
        <TextField label="Button Text" value={data.buttonText || ''} onChange={v => set('buttonText', v)} />
        <TextField label="Button URL" value={data.buttonLink || ''} onChange={v => set('buttonLink', v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Style</p>
        <ColorField label="Background" value={data.backgroundColor || '#27491F'} onChange={v => set('backgroundColor', v)} allowGradient />
        <ColorField label="Button Background" value={data.buttonBackgroundColor || '#ffffff'} onChange={v => set('buttonBackgroundColor', v)} />
        <ColorField label="Button Text" value={data.buttonTextColor || '#27491F'} onChange={v => set('buttonTextColor', v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(CTAEditor);
