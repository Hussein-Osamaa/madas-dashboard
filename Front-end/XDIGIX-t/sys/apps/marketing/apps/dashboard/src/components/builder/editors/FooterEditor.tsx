import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { FooterSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ColorField from './shared/ColorField';
import SelectField from './shared/SelectField';
import ToggleField from './shared/ToggleField';
import ImageField from './shared/ImageField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const FooterEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<FooterSectionData>(section.data as FooterSectionData);
  useEffect(() => { setData(section.data as FooterSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Branding</p>
        <SelectField label="Layout" value={data.layout||'classic'} onChange={v=>set('layout',v)} options={[{value:'classic',label:'Classic (columns)'},{value:'minimal',label:'Minimal (single row)'}]} />
        <TextField label="Logo Text" value={data.logoText||''} onChange={v=>set('logoText',v)} />
        <ImageField label="Logo Image" value={data.logo||''} onChange={v=>set('logo',v)} />
        <TextField label="Tagline" value={data.tagline||''} onChange={v=>set('tagline',v)} multiline rows={2} />
        <TextField label="Copyright Text" value={data.copyrightText||''} onChange={v=>set('copyrightText',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Colors</p>
        <ColorField label="Background" value={data.backgroundColor||'#1f2937'} onChange={v=>set('backgroundColor',v)} />
        <ColorField label="Text Color" value={data.textColor||'#ffffff'} onChange={v=>set('textColor',v)} />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Social Links</p>
        <ArrayEditor label="Social Links" items={data.socialLinks||[]} onChange={items=>set('socialLinks',items)} createDefault={()=>({platform:'Instagram',icon:'camera_alt',link:'#'})} addLabel="Add Social Link"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <TextField label="Platform" value={item.platform} onChange={v=>onChange({...item,platform:v})} />
              <TextField label="URL" value={item.link} onChange={v=>onChange({...item,link:v})} />
            </div>
          )}
        />
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Newsletter</p>
        <ToggleField label="Show Newsletter" value={!!data.showNewsletter} onChange={v=>set('showNewsletter',v)} />
        {data.showNewsletter && (
          <>
            <TextField label="Newsletter Text" value={data.newsletterText||''} onChange={v=>set('newsletterText',v)} />
            <TextField label="Placeholder" value={data.newsletterPlaceholder||''} onChange={v=>set('newsletterPlaceholder',v)} />
          </>
        )}
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(FooterEditor);
