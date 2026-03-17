import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { StatsSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const StatsEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<StatsSectionData>(section.data as StatsSectionData);
  useEffect(() => { setData(section.data as StatsSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
        <SelectField label="Layout" value={data.layout||'row'} onChange={v=>set('layout',v)} options={[{value:'row',label:'Row'},{value:'grid',label:'Grid'}]} />
        <ToggleField label="Animated Counter" value={!!data.animated} onChange={v=>set('animated',v)} />
      </div>
      <div className="p-4">
        <ArrayEditor label="Stats" items={data.stats||[]} onChange={items=>set('stats',items)} createDefault={()=>({value:'0+',label:'Metric',icon:'📊'})} addLabel="Add Stat"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <TextField label="Icon (emoji)" value={item.icon||''} onChange={v=>onChange({...item,icon:v})} />
              <TextField label="Value" value={item.value} onChange={v=>onChange({...item,value:v})} placeholder="10K+" />
              <TextField label="Label" value={item.label} onChange={v=>onChange({...item,label:v})} placeholder="Happy Customers" />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(StatsEditor);
