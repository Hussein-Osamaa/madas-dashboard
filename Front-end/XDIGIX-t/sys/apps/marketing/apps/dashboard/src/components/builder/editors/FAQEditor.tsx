import React, { useState, useEffect } from 'react';
import type { EditorProps } from '../../../registry/types';
import type { FAQSectionData } from '../../../types/builder';
import TextField from './shared/TextField';
import ArrayEditor from './shared/ArrayEditor';
import StylePanel from './shared/StylePanel';

const FAQEditor: React.FC<EditorProps> = ({ section, onUpdate }) => {
  const [data, setData] = useState<FAQSectionData>(section.data as FAQSectionData);
  useEffect(() => { setData(section.data as FAQSectionData); }, [section.id]);
  const set = (field: string, value: unknown) => {
    const next = { ...data, [field]: value }; setData(next); onUpdate(next as Record<string,unknown>);
  };
  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Header</p>
        <TextField label="Title" value={data.title||''} onChange={v=>set('title',v)} />
      </div>
      <div className="p-4">
        <ArrayEditor label="Questions" items={data.items||[]} onChange={items=>set('items',items)} createDefault={()=>({question:'New Question?',answer:'Answer here.'})} addLabel="Add Question"
          renderItem={(item,_,onChange)=>(
            <div className="space-y-2">
              <TextField label="Question" value={item.question} onChange={v=>onChange({...item,question:v})} />
              <TextField label="Answer" value={item.answer} onChange={v=>onChange({...item,answer:v})} multiline rows={3} />
            </div>
          )}
        />
      </div>
      <StylePanel section={section} onUpdate={onUpdate} />
    </div>
  );
};
export default React.memo(FAQEditor);
