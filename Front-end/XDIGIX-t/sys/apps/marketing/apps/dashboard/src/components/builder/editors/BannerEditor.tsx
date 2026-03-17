import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { BannerSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import ToggleField from './shared/ToggleField';
import NumberField from './shared/NumberField';
import StylePanel from './shared/StylePanel';

const BannerEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<BannerSectionData>(section.data as BannerSectionData);
  useEffect(() => { setData(section.data as BannerSectionData); }, [section.id]);

  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(next as Record<string, unknown>);
  };

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</p>
        <TextField label="Announcement Text" value={data.text || ''} onChange={v => set('text', v)} multiline rows={2} maxLength={200} />
        <TextField label="Link Text" value={data.linkText || ''} onChange={v => set('linkText', v)} placeholder="Shop Now" />
        <TextField label="Link URL" value={data.link || ''} onChange={v => set('link', v)} placeholder="https://" />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Appearance</p>
        <ColorField label="Background" value={data.backgroundColor || '#27491F'} onChange={v => set('backgroundColor', v)} />
        <ColorField label="Text Color" value={data.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
        <ToggleField label="Dismissable" value={!!data.dismissible} onChange={v => set('dismissible', v)} helperText="Show × close button" />
        <ToggleField label="Scrolling Marquee" value={!!data.enableMarquee} onChange={v => set('enableMarquee', v)} />
        {data.enableMarquee && (
          <NumberField label="Scroll Speed" value={data.marqueeSpeed ?? 15} onChange={v => set('marqueeSpeed', v)} min={5} max={60} unit="s" showSlider />
        )}
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};

export default React.memo(BannerEditor);
