import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { ProductsSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import NumberField from './shared/NumberField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import StylePanel from './shared/StylePanel';

const ProductsEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<ProductsSectionData>(section.data as ProductsSectionData);
  useEffect(() => { setData(section.data as ProductsSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  const setCard = (field: string, value: unknown) => {
    set('cardStyle', { ...(data.cardStyle || {}), [field]: value });
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Layout</p>
        <SelectField label="Layout" value={data.layout||'grid'} onChange={v=>set('layout',v)} options={[{value:'grid',label:'Grid'},{value:'carousel',label:'Carousel'},{value:'list',label:'List'}]} />
        <SelectField label="Columns" value={String(data.columns||4)} onChange={v=>set('columns',Number(v))} options={[{value:'2',label:'2 columns'},{value:'3',label:'3 columns'},{value:'4',label:'4 columns'}]} />
        <ToggleField label="Show Price" value={data.showPrice!==false} onChange={v=>set('showPrice',v)} />
        <ToggleField label="Show Add to Cart" value={data.showAddToCart!==false} onChange={v=>set('showAddToCart',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Card Style</p>
        <ColorField label="Card Background" value={data.cardStyle?.backgroundColor||'#ffffff'} onChange={v=>setCard('backgroundColor',v)} />
        <ColorField label="Text Color" value={data.cardStyle?.textColor||'#1f2937'} onChange={v=>setCard('textColor',v)} />
        <ColorField label="Button Background" value={data.cardStyle?.buttonBackgroundColor||'#27491F'} onChange={v=>setCard('buttonBackgroundColor',v)} />
        <ColorField label="Button Text" value={data.cardStyle?.buttonTextColor||'#ffffff'} onChange={v=>setCard('buttonTextColor',v)} />
        <NumberField label="Border Radius" value={data.cardStyle?.borderRadius??12} onChange={v=>setCard('borderRadius',v)} min={0} max={32} unit="px" showSlider />
        <SelectField label="Image Fit" value={data.cardStyle?.imageFit||'contain'} onChange={v=>setCard('imageFit',v)} options={[{value:'contain',label:'Contain'},{value:'cover',label:'Cover'}]} />
        <ToggleField label="Show Border" value={data.cardStyle?.showBorder!==false} onChange={v=>setCard('showBorder',v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(ProductsEditor);
