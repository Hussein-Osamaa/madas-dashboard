import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { CollectionsSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import NumberField from './shared/NumberField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import StylePanel from './shared/StylePanel';

const CollectionsEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<CollectionsSectionData>(section.data as CollectionsSectionData);
  useEffect(() => { setData(section.data as CollectionsSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  const setCard = (field: string, value: unknown) => set('cardStyle', { ...(data.cardStyle||{}), [field]: value });
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Layout</p>
        <SelectField label="Layout" value={data.layout||'grid'} onChange={v=>set('layout',v)} options={[{value:'grid',label:'Grid'},{value:'carousel',label:'Carousel'},{value:'featured',label:'Featured'}]} />
        <SelectField label="Columns" value={String(data.columns||4)} onChange={v=>set('columns',Number(v))} options={[{value:'2',label:'2'},{value:'3',label:'3'},{value:'4',label:'4'},{value:'5',label:'5'},{value:'6',label:'6'}]} />
        <SelectField label="Image Aspect" value={data.cardStyle?.imageAspect||'square'} onChange={v=>setCard('imageAspect',v)} options={[{value:'square',label:'Square'},{value:'portrait',label:'Portrait'},{value:'landscape',label:'Landscape'},{value:'wide',label:'Wide'}]} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Overlay</p>
        <ColorField label="Overlay Color" value={data.cardStyle?.overlayColor||'#000000'} onChange={v=>setCard('overlayColor',v)} />
        <NumberField label="Overlay Opacity" value={Math.round((data.cardStyle?.overlayOpacity??0.4)*100)} onChange={v=>setCard('overlayOpacity',v/100)} min={0} max={100} unit="%" showSlider />
        <ToggleField label="Show Collection Name" value={data.cardStyle?.showName!==false} onChange={v=>setCard('showName',v)} />
        <ToggleField label="Show Product Count" value={!!data.cardStyle?.showProductCount} onChange={v=>setCard('showProductCount',v)} />
        <SelectField label="Name Position" value={data.cardStyle?.namePosition||'overlay'} onChange={v=>setCard('namePosition',v)} options={[{value:'overlay',label:'On image'},{value:'below',label:'Below image'}]} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(CollectionsEditor);
