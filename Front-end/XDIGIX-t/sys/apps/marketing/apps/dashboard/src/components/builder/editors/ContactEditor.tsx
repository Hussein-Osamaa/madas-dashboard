import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { ContactSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import StylePanel from './shared/StylePanel';

const ContactEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<ContactSectionData>(section.data as ContactSectionData);
  useEffect(() => { setData(section.data as ContactSectionData); }, [section.id]);

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
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Details</p>
        <TextField label="Email" value={data.email || ''} onChange={v => set('email', v)} placeholder="hello@example.com" />
        <TextField label="Phone" value={data.phone || ''} onChange={v => set('phone', v)} placeholder="+1 234 567 890" />
        <TextField label="Address" value={data.address || ''} onChange={v => set('address', v)} multiline rows={2} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(ContactEditor);
