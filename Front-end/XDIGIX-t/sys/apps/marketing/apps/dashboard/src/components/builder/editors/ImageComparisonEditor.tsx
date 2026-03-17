import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { ImageComparisonSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ImageField from './shared/ImageField';
import ColorField from './shared/ColorField';
import NumberField from './shared/NumberField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import StylePanel from './shared/StylePanel';

const ImageComparisonEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<ImageComparisonSectionData>(section.data as ImageComparisonSectionData);
  useEffect(() => { setData(section.data as ImageComparisonSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Images</p>
        <ImageField label="Before Image" value={data.beforeImage||''} onChange={v=>set('beforeImage',v)} />
        <TextField label="Before Label" value={data.beforeLabel||'Before'} onChange={v=>set('beforeLabel',v)} />
        <ImageField label="After Image" value={data.afterImage||''} onChange={v=>set('afterImage',v)} />
        <TextField label="After Label" value={data.afterLabel||'After'} onChange={v=>set('afterLabel',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Slider</p>
        <NumberField label="Initial Position" value={data.sliderPosition??50} onChange={v=>set('sliderPosition',v)} min={10} max={90} unit="%" showSlider />
        <ColorField label="Slider Color" value={data.sliderColor||'#FFFFFF'} onChange={v=>set('sliderColor',v)} />
        <ToggleField label="Show Labels" value={data.showLabels!==false} onChange={v=>set('showLabels',v)} />
        <SelectField label="Orientation" value={data.orientation||'horizontal'} onChange={v=>set('orientation',v)} options={[{value:'horizontal',label:'Horizontal'},{value:'vertical',label:'Vertical'}]} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(ImageComparisonEditor);
