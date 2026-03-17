import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { NewsletterSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import StylePanel from './shared/StylePanel';

const NewsletterEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<NewsletterSectionData>(section.data as NewsletterSectionData);
  useEffect(() => { setData(section.data as NewsletterSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} multiline rows={2} />
        <TextField label="Input Placeholder" value={data.placeholder||''} onChange={v=>set('placeholder',v)} placeholder="Enter your email..." />
        <TextField label="Button Text" value={data.buttonText||''} onChange={v=>set('buttonText',v)} placeholder="Subscribe" />
        <TextField label="Success Message" value={data.successMessage||''} onChange={v=>set('successMessage',v)} helperText="Shown after submission" />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Style</p>
        <ColorField label="Background" value={data.backgroundColor||'#f9fafb'} onChange={v=>set('backgroundColor',v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(NewsletterEditor);
