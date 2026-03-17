import React, { useState } from 'react';
import type { Section } from '../../../../types/builder';
import ColorField from './ColorField';
import NumberField from './NumberField';
import SelectField from './SelectField';

interface StylePanelProps {
  section: Section;
  onUpdate: (data: Record<string, unknown>) => void;
}

const StylePanel: React.FC<StylePanelProps> = ({ section, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const style = section.style || {};

  const setStyle = (key: string, value: unknown) => {
    onUpdate({ ...section.data, _style: { ...style, [key]: value } });
  };

  const animationOptions = [
    { value: 'none', label: 'None' },
    { value: 'fadeIn', label: 'Fade In' },
    { value: 'slideUp', label: 'Slide Up' },
    { value: 'slideDown', label: 'Slide Down' },
    { value: 'slideLeft', label: 'Slide from Left' },
    { value: 'slideRight', label: 'Slide from Right' },
  ];

  return (
    <div className="border-t border-gray-100 mt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <span className="material-icons text-sm text-gray-400">tune</span>
          Section Style
        </span>
        <span className="material-icons text-sm text-gray-400">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          <ColorField label="Background" value={style.backgroundColor || ''} onChange={v => setStyle('backgroundColor', v)} allowGradient />
          <NumberField label="Padding Top" value={style.paddingTop ?? 60} onChange={v => setStyle('paddingTop', v)} min={0} max={200} unit="px" showSlider />
          <NumberField label="Padding Bottom" value={style.paddingBottom ?? 60} onChange={v => setStyle('paddingBottom', v)} min={0} max={200} unit="px" showSlider />
          <NumberField label="Border Radius" value={style.borderRadius ?? 0} onChange={v => setStyle('borderRadius', v)} min={0} max={64} unit="px" showSlider />
          <SelectField label="Animation" value={style.animation || 'none'} onChange={v => setStyle('animation', v)} options={animationOptions} />
        </div>
      )}
    </div>
  );
};

export default StylePanel;
