import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { PartnersSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ImageField from './shared/ImageField';
import ToggleField from './shared/ToggleField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const PartnersEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<PartnersSectionData>(section.data as PartnersSectionData);
  useEffect(() => { setData(section.data as PartnersSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
        <ToggleField label="Grayscale Logos" value={!!data.grayscale} onChange={v=>set('grayscale',v)} helperText="Color on hover" />
        <ToggleField label="Auto-scroll" value={!!data.autoScroll} onChange={v=>set('autoScroll',v)} />
      </div>
      <div className="p-4">
        <ArrayEditor label="Partner Logos" items={data.partners||[]} onChange={items=>set('partners',items)} createDefault={()=>({name:'Partner',logo:'',link:'#'})} addLabel="Add Partner"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <TextField label="Name" value={item.name} onChange={v=>onChange({...item,name:v})} />
              <ImageField label="Logo" value={item.logo} onChange={v=>onChange({...item,logo:v})} />
              <TextField label="Website URL" value={item.link||''} onChange={v=>onChange({...item,link:v})} />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(PartnersEditor);
