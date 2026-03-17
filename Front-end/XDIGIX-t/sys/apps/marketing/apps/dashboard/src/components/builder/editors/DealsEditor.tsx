import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { DealsSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import NumberField from './shared/NumberField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import StylePanel from './shared/StylePanel';

const DealsEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<DealsSectionData>(section.data as DealsSectionData);
  useEffect(() => { setData(section.data as DealsSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  const setCard = (field: string, value: unknown) => set('cardStyle', { ...(data.cardStyle||{}), [field]: value });
  const setTimer = (field: string, value: unknown) => set('countdownStyle', { ...(data.countdownStyle||{}), [field]: value });
  const dateValue = data.countdownEndDate ? new Date(data.countdownEndDate).toISOString().slice(0,16) : '';
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="View More Text" value={data.viewMoreText||''} onChange={v=>set('viewMoreText',v)} />
        <TextField label="View More URL" value={data.viewMoreLink||''} onChange={v=>set('viewMoreLink',v)} />
        <SelectField label="Columns" value={String(data.columns||4)} onChange={v=>set('columns',Number(v))} options={[{value:'2',label:'2'},{value:'3',label:'3'},{value:'4',label:'4'}]} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Countdown Timer</p>
        <ToggleField label="Show Countdown" value={!!data.showCountdown} onChange={v=>set('showCountdown',v)} />
        {data.showCountdown && (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">End Date & Time</label>
              <input type="datetime-local" value={dateValue} onChange={e=>set('countdownEndDate',new Date(e.target.value).toISOString())}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
            </div>
            <ColorField label="Timer Background" value={data.countdownStyle?.backgroundColor||'#27491F'} onChange={v=>setTimer('backgroundColor',v)} />
            <ColorField label="Timer Text" value={data.countdownStyle?.textColor||'#ffffff'} onChange={v=>setTimer('textColor',v)} />
          </>
        )}
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Card Style</p>
        <ColorField label="Card Background" value={data.cardStyle?.backgroundColor||'#ffffff'} onChange={v=>setCard('backgroundColor',v)} />
        <ColorField label="Button Background" value={data.cardStyle?.buttonBackgroundColor||'#F0CAE1'} onChange={v=>setCard('buttonBackgroundColor',v)} />
        <ColorField label="Button Text" value={data.cardStyle?.buttonTextColor||'#27491F'} onChange={v=>setCard('buttonTextColor',v)} />
        <NumberField label="Border Radius" value={data.cardStyle?.borderRadius??8} onChange={v=>setCard('borderRadius',v)} min={0} max={32} unit="px" showSlider />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(DealsEditor);
