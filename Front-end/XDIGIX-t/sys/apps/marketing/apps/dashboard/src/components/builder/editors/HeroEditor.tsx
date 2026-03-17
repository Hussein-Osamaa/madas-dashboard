import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { HeroSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import ImageField from './shared/ImageField';
import ToggleField from './shared/ToggleField';
import SelectField from './shared/SelectField';
import StylePanel from './shared/StylePanel';

const layoutOptions = [
  { value: 'default', label: 'Default' },
  { value: 'minimal', label: 'Minimal (text only)' },
];
const alignOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const HeroEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<HeroSectionData>(section.data as HeroSectionData);
  useEffect(() => { setData(section.data as HeroSectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      {/* Content */}
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <SelectField label="Layout" value={data.layout || 'default'} onChange={v => set('layout', v)} options={layoutOptions} />
        <TextField label="Headline" value={data.title || ''} onChange={v => set('title', v)} placeholder="Welcome to Our Store" maxLength={100} />
        <TextField label="Subheading" value={data.subtitle || ''} onChange={v => set('subtitle', v)} placeholder="Discover amazing products" multiline rows={2} maxLength={200} />
        <TextField label="Button Text" value={data.buttonText || ''} onChange={v => set('buttonText', v)} placeholder="Shop Now" />
        <TextField label="Button Link" value={data.buttonLink || ''} onChange={v => set('buttonLink', v)} placeholder="https://" />
      </div>
      {/* Style */}
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Style</p>
        <ColorField label="Background Color" value={data.backgroundColor || ''} onChange={v => set('backgroundColor', v)} allowGradient />
        <ImageField label="Background Image" value={data.backgroundImage || ''} onChange={v => set('backgroundImage', v)} />
        <ColorField label="Text Color" value={data.textColor || '#FFFFFF'} onChange={v => set('textColor', v)} />
        <SelectField label="Text Alignment" value={data.textStyle?.titleAlignment || 'center'} onChange={v => set('textStyle', { ...data.textStyle, titleAlignment: v })} options={alignOptions} />
        <ToggleField label="Carousel Mode" value={!!data.isCarousel} onChange={v => set('isCarousel', v)} helperText="Show multiple slides" />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(HeroEditor);
