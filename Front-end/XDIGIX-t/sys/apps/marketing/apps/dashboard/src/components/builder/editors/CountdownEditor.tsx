import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { CountdownSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import ToggleField from './shared/ToggleField';
import StylePanel from './shared/StylePanel';

const CountdownEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<CountdownSectionData>(section.data as CountdownSectionData);
  useEffect(() => { setData(section.data as CountdownSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };

  const dateValue = data.targetDate ? new Date(data.targetDate).toISOString().slice(0,16) : '';

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Target Date & Time</label>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={e=>set('targetDate', new Date(e.target.value).toISOString())}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
        <TextField label="Expired Message" value={data.expiredMessage||''} onChange={v=>set('expiredMessage',v)} placeholder="The wait is over!" />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Display</p>
        <div className="grid grid-cols-2 gap-3">
          <ToggleField label="Days"    value={data.showDays!==false}    onChange={v=>set('showDays',v)} />
          <ToggleField label="Hours"   value={data.showHours!==false}   onChange={v=>set('showHours',v)} />
          <ToggleField label="Minutes" value={data.showMinutes!==false} onChange={v=>set('showMinutes',v)} />
          <ToggleField label="Seconds" value={data.showSeconds!==false} onChange={v=>set('showSeconds',v)} />
        </div>
        <ColorField label="Background" value={data.backgroundColor||'#27491F'} onChange={v=>set('backgroundColor',v)} allowGradient />
        <ColorField label="Text Color" value={data.textColor||'#ffffff'} onChange={v=>set('textColor',v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(CountdownEditor);
