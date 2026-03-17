import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { TestimonialsSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ImageField from './shared/ImageField';
import NumberField from './shared/NumberField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const TestimonialsEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<TestimonialsSectionData>(section.data as TestimonialsSectionData);
  useEffect(() => { setData(section.data as TestimonialsSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
      </div>
      <div className="p-4">
        <ArrayEditor label="Reviews" items={data.items||[]} onChange={items=>set('items',items)} createDefault={()=>({name:'Customer',role:'Verified Buyer',text:'Great product!',rating:5,image:''})} addLabel="Add Review"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <ImageField label="Photo" value={item.image||''} onChange={v=>onChange({...item,image:v})} />
              <TextField label="Name" value={item.name} onChange={v=>onChange({...item,name:v})} />
              <TextField label="Role" value={item.role} onChange={v=>onChange({...item,role:v})} placeholder="Verified Buyer" />
              <TextField label="Review Text" value={item.text} onChange={v=>onChange({...item,text:v})} multiline rows={3} />
              <NumberField label="Stars" value={item.rating} onChange={v=>onChange({...item,rating:v})} min={1} max={5} />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(TestimonialsEditor);
