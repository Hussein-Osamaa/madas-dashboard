import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { FeaturesSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const FeaturesEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<FeaturesSectionData>(section.data as FeaturesSectionData);
  useEffect(() => { setData(section.data as FeaturesSectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title || ''} onChange={v => set('title', v)} />
        <TextField label="Subtitle" value={data.subtitle || ''} onChange={v => set('subtitle', v)} />
      </div>
      <div className="p-4 space-y-4">
        <ArrayEditor
          label="Feature Cards"
          items={data.items || []}
          onChange={items => set('items', items)}
          createDefault={() => ({ icon: '⭐', title: 'New Feature', description: 'Feature description' })}
          addLabel="Add Feature"
          renderItem={(item, _, onChange) => (
            <div className="space-y-2">
              <TextField label="Icon (emoji)" value={item.icon} onChange={v => onChange({ ...item, icon: v })} />
              <TextField label="Title" value={item.title} onChange={v => onChange({ ...item, title: v })} />
              <TextField label="Description" value={item.description} onChange={v => onChange({ ...item, description: v })} multiline rows={2} />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(FeaturesEditor);
