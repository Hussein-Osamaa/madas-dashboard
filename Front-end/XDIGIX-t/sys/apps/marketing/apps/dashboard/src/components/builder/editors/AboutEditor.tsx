import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { AboutSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ImageField from './shared/ImageField';
import StylePanel from './shared/StylePanel';

const AboutEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<AboutSectionData>(section.data as AboutSectionData);
  useEffect(() => { setData(section.data as AboutSectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <TextField label="Title" value={data.title || ''} onChange={v => set('title', v)} />
        <TextField label="Story / Description" value={data.content || ''} onChange={v => set('content', v)} multiline rows={5} helperText="Tell your brand story" />
        <ImageField label="Brand Image" value={data.image || ''} onChange={v => set('image', v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(AboutEditor);
