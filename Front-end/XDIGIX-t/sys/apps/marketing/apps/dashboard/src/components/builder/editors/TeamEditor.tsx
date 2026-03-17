import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { TeamSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ImageField from './shared/ImageField';
import SelectField from './shared/SelectField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const TeamEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<TeamSectionData>(section.data as TeamSectionData);
  useEffect(() => { setData(section.data as TeamSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
        <SelectField label="Layout" value={data.layout||'grid'} onChange={v=>set('layout',v)} options={[{value:'grid',label:'Grid'},{value:'carousel',label:'Carousel'}]} />
      </div>
      <div className="p-4">
        <ArrayEditor label="Team Members" items={data.members||[]} onChange={items=>set('members',items)} createDefault={()=>({name:'New Member',role:'Position',image:'',bio:''})} addLabel="Add Member"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <ImageField label="Photo" value={item.image||''} onChange={v=>onChange({...item,image:v})} />
              <TextField label="Name" value={item.name} onChange={v=>onChange({...item,name:v})} />
              <TextField label="Role / Title" value={item.role} onChange={v=>onChange({...item,role:v})} />
              <TextField label="Bio" value={item.bio||''} onChange={v=>onChange({...item,bio:v})} multiline rows={2} />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(TeamEditor);
