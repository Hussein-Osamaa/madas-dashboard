import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';
import { SelectedElement } from '../../types/elementEditor';
import { Section } from '../../types/builder';

interface Props {
  element: SelectedElement | null;
  anchorRect: DOMRect | null;
  section: Section | null;
  onUpdate: (sectionId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const SWATCHES = ['#1a1a1a', '#27491F', '#ffffff', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa'];

function deriveFieldKey(element: SelectedElement): string {
  switch (element.type) {
    case 'title':       return 'title';
    case 'subtitle':    return 'subtitle';
    case 'description': return 'description';
    case 'button':      return 'buttonText';
    case 'label':       return 'label';
    case 'price':       return 'price';
    case 'badge':       return 'badge';
    case 'link':        return 'linkText';
    case 'menuItem':    return 'text';
    case 'testimonial': return 'text';
    case 'faqItem':     return 'question';
    case 'feature':     return 'text';
    case 'service':     return 'text';
    case 'teamMember':  return 'name';
    default:
      return (element as { fieldKey?: string }).fieldKey ?? 'title';
  }
}

function deriveColorKey(fieldKey: string): string {
  if (fieldKey === 'title')      return 'titleColor';
  if (fieldKey === 'subtitle')   return 'subtitleColor';
  if (fieldKey === 'buttonText') return 'buttonTextColor';
  return 'textColor';
}

export default function FloatingElementEditor({ element, anchorRect, section, onUpdate, onClose }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fieldKey = element ? deriveFieldKey(element) : 'title';
  const rawValue = section ? String((section.data as Record<string, unknown>)[fieldKey] ?? '') : '';

  // Controlled local state — syncs with external section data (handles undo/redo)
  const [localValue, setLocalValue] = useState(rawValue);
  useEffect(() => { setLocalValue(rawValue); }, [rawValue]);

  // Position calculation
  let posStyle: React.CSSProperties = { display: 'none' };
  if (element && anchorRect) {
    const W = 248, H = 240;
    let left = anchorRect.right + 12;
    let top = anchorRect.top;
    if (left + W > window.innerWidth - 8) left = anchorRect.left - W - 12;
    if (top + H > window.innerHeight - 8) top = window.innerHeight - H - 8;
    if (top < 52) top = 52;
    posStyle = { position: 'fixed', left, top, width: W, zIndex: 200 };
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onClose();
    };
    if (element) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [element, onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (element) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [element, onClose]);

  if (!element || !section) return null;

  const fieldLabel = fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/([A-Z])/g, ' $1');
  const colorKey = deriveColorKey(fieldKey);
  const isButtonType = element.type === 'button';

  return createPortal(
    <div
      ref={wrapperRef}
      style={posStyle}
      className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#27491F]" />
          <span className="text-[11px] font-semibold text-[#ccc] capitalize">{element.type} text</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#2a2a2a] transition-colors"
        >
          <X size={10} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Content field — controlled */}
        <div>
          <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">
            {fieldLabel}
          </label>
          <textarea
            rows={2}
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onUpdate(section.id, { [fieldKey]: e.target.value });
            }}
            className="w-full bg-[#252525] border border-[#333] rounded-md text-[#e8e8e8] text-[12px] px-2 py-1.5 outline-none resize-none focus:border-[#27491F] font-sans"
          />
        </div>

        {/* Color row */}
        <div>
          <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Text color</label>
          <div className="flex gap-1.5 flex-wrap">
            {SWATCHES.map((color) => (
              <button
                key={color}
                title={color}
                style={{ background: color, borderColor: color === '#ffffff' ? '#444' : 'transparent' }}
                onClick={() => onUpdate(section.id, { [colorKey]: color })}
                className="w-5 h-5 rounded border-2 hover:scale-110 transition-transform"
              />
            ))}
          </div>
        </div>

        {/* Link field — buttons only */}
        {isButtonType && (
          <div>
            <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Link URL</label>
            <input
              type="text"
              placeholder="https://…"
              value={String((section.data as Record<string, unknown>).buttonLink ?? '')}
              onChange={(e) => onUpdate(section.id, { buttonLink: e.target.value })}
              className="w-full bg-[#252525] border border-[#333] rounded-md text-[#e8e8e8] text-[12px] px-2 py-1.5 outline-none focus:border-[#27491F] font-sans"
            />
          </div>
        )}

        {/* Redirect note */}
        <div className="flex items-start gap-1.5 p-2 bg-[#1a2318] border border-[#27491F33] rounded-md">
          <Info size={11} className="text-[#6dbf67] flex-shrink-0 mt-0.5" />
          <span className="text-[10px] text-[#6dbf67] leading-[1.5]">
            Layout &amp; style settings are in the <strong>Style tab</strong> of section settings.
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
