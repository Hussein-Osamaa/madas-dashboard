import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { PricingSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import NumberField from './shared/NumberField';
import ToggleField from './shared/ToggleField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const PricingEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<PricingSectionData>(section.data as PricingSectionData);
  useEffect(() => { setData(section.data as PricingSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
        <div className="flex gap-3">
          <TextField label="Currency Symbol" value={data.currency||'$'} onChange={v=>set('currency',v)} />
          <TextField label="Billing Period" value={data.billingPeriod||'/month'} onChange={v=>set('billingPeriod',v)} placeholder="/month" />
        </div>
      </div>
      <div className="p-4">
        <ArrayEditor label="Plans" items={data.plans||[]} onChange={items=>set('plans',items)} createDefault={()=>({name:'New Plan',price:0,features:['Feature 1'],highlighted:false,buttonText:'Get Started'})} addLabel="Add Plan"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <TextField label="Plan Name" value={item.name} onChange={v=>onChange({...item,name:v})} />
              <NumberField label="Price" value={item.price} onChange={v=>onChange({...item,price:v})} min={0} max={9999} />
              <TextField label="Button Text" value={item.buttonText||'Get Started'} onChange={v=>onChange({...item,buttonText:v})} />
              <ToggleField label="Highlighted (Popular)" value={!!item.highlighted} onChange={v=>onChange({...item,highlighted:v})} />
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Features (one per line)</label>
                <textarea
                  value={(item.features||[]).join('\n')}
                  onChange={e=>onChange({...item,features:e.target.value.split('\n').filter(Boolean)})}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-white"
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                />
              </div>
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(PricingEditor);
