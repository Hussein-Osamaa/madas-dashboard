import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { VideoSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import ImageField from './shared/ImageField';
import StylePanel from './shared/StylePanel';

const VideoEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<VideoSectionData>(section.data as VideoSectionData);
  useEffect(() => { setData(section.data as VideoSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
        <TextField label="Subtitle" value={data.subtitle||''} onChange={v=>set('subtitle',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Video</p>
        <SelectField label="Video Type" value={data.videoType||'youtube'} onChange={v=>set('videoType',v)} options={[{value:'youtube',label:'YouTube'},{value:'vimeo',label:'Vimeo'},{value:'custom',label:'Custom MP4'}]} />
        <TextField label="Video URL" value={data.videoUrl||''} onChange={v=>set('videoUrl',v)} placeholder="https://youtube.com/watch?v=..." helperText="Paste full URL or embed URL" />
        <ImageField label="Thumbnail (optional)" value={data.thumbnailUrl||''} onChange={v=>set('thumbnailUrl',v)} helperText="Shows before video plays" />
        <ToggleField label="Autoplay" value={!!data.autoplay} onChange={v=>set('autoplay',v)} />
        <ToggleField label="Show Controls" value={data.showControls!==false} onChange={v=>set('showControls',v)} />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(VideoEditor);
