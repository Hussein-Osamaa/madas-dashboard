import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { GallerySectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import SelectField from './shared/SelectField';
import NumberField from './shared/NumberField';
import ImageField from './shared/ImageField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const GalleryEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<GallerySectionData>(section.data as GallerySectionData);
  useEffect(() => { setData(section.data as GallerySectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
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
        <SelectField label="Layout" value={data.layout||'grid'} onChange={v=>set('layout',v)} options={[{value:'grid',label:'Grid'},{value:'masonry',label:'Masonry'},{value:'carousel',label:'Carousel'}]} />
        <NumberField label="Columns" value={data.columns??3} onChange={v=>set('columns',v)} min={2} max={4} />
      </div>
      <div className="p-4 space-y-4">
        <ArrayEditor label="Images" items={data.images||[]} onChange={items=>set('images',items)} createDefault={()=>({url:'',alt:'',caption:''})} addLabel="Add Image"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <ImageField label="Image" value={item.url} onChange={v=>onChange({...item,url:v})} />
              <TextField label="Alt Text" value={item.alt} onChange={v=>onChange({...item,alt:v})} />
              <TextField label="Caption" value={item.caption||''} onChange={v=>onChange({...item,caption:v})} />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(GalleryEditor);
