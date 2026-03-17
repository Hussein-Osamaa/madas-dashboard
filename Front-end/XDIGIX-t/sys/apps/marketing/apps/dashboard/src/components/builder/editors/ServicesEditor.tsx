import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { ServicesSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import SelectField from './shared/SelectField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const ServicesEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<ServicesSectionData>(section.data as ServicesSectionData);
  useEffect(() => { setData(section.data as ServicesSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
        <SelectField label="Layout" value={data.layout||'grid'} onChange={v=>set('layout',v)} options={[{value:'grid',label:'Grid'},{value:'list',label:'List'},{value:'cards',label:'Cards'}]} />
      </div>
      <div className="p-4">
        <ArrayEditor label="Services" items={data.services||[]} onChange={items=>set('services',items)} createDefault={()=>({icon:'🔧',title:'New Service',description:'Service description',price:''})} addLabel="Add Service"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <TextField label="Icon (emoji)" value={item.icon} onChange={v=>onChange({...item,icon:v})} />
              <TextField label="Title" value={item.title} onChange={v=>onChange({...item,title:v})} />
              <TextField label="Description" value={item.description} onChange={v=>onChange({...item,description:v})} multiline rows={2} />
              <TextField label="Price (optional)" value={item.price||''} onChange={v=>onChange({...item,price:v})} placeholder="Free / $99" />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(ServicesEditor);
