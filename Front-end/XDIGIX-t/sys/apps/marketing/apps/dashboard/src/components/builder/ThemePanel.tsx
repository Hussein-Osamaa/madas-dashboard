import { useState, useCallback, useRef, memo } from 'react';
import { ChevronDown, X, Upload } from 'lucide-react';
import clsx from 'clsx';
import {
  useTheme,
  FONT_OPTIONS,
  DEFAULT_THEME,
  DEFAULT_COLOR_SCHEMES,
  CURRENCY_OPTIONS,
  SiteTheme,
  ColorScheme,
} from '../../contexts/ThemeContext';

/* ─────────────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────────────── */
interface Props {
  onClose: () => void;
  onSave?: (theme: SiteTheme) => void;
}

/* ─────────────────────────────────────────────────────────────────────────
   Reusable small controls
───────────────────────────────────────────────────────────────────────── */

/** Collapsible accordion wrapper (controlled) */
const Accordion = memo(({ label, isOpen, onToggle, children }: { label: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) => {
  return (
    <div className="border-b border-[#f3f4f6]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-[13.5px] font-medium text-[#111827] hover:bg-[#f9fafb] transition-colors"
      >
        {label}
        <ChevronDown size={16} className={clsx('text-[#9ca3af] transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3.5">{children}</div>}
    </div>
  );
});
Accordion.displayName = 'Accordion';

/** Color swatch + label + hex */
const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2.5">
    <label className="relative w-8 h-8 rounded-lg border border-[#e5e7eb] overflow-hidden flex-shrink-0 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="w-full h-full" style={{ backgroundColor: value }} />
    </label>
    <span className="flex-1 text-[13px] text-[#374151]">{label}</span>
    <input
      type="text"
      value={value}
      onChange={e => {
        const v = e.target.value;
        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
      }}
      className="w-[76px] text-[11px] font-mono text-[#9ca3af] bg-transparent border border-[#e5e7eb] rounded-md px-2 py-1 focus:outline-none focus:border-[#111827]"
      maxLength={7}
    />
  </div>
);

/** Range slider with value display */
const RangeField = ({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) => (
  <div>
    <label className="text-[12px] text-[#6b7280] font-medium mb-1.5 block">{label}</label>
    <div className="flex items-center gap-2.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-[#111827] h-1"
      />
      <span className="text-[11px] text-[#6b7280] min-w-[40px] text-right tabular-nums">{value}{unit}</span>
    </div>
  </div>
);

/** Select dropdown */
const SelectField = ({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-[12px] text-[#6b7280] font-medium mb-1.5 block">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-[13px] border border-[#d1d5db] rounded-lg px-3 py-2 text-[#111827] bg-white focus:outline-none focus:border-[#111827] appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%239ca3af%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center]"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

/** Button group (segmented control) */
const ButtonGroup = <T extends string>({ label, value, options, onChange }: {
  label?: string; value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div>
    {label && <label className="text-[12px] text-[#6b7280] font-medium mb-1.5 block">{label}</label>}
    <div className="flex gap-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 py-2 text-[12px] font-medium border rounded-lg transition-all',
            value === o.value
              ? 'bg-[#111827] text-white border-[#111827]'
              : 'border-[#d1d5db] text-[#6b7280] hover:border-[#9ca3af]'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

/** Toggle switch */
const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-[13px] text-[#374151]">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={clsx(
        'relative w-9 h-5 rounded-full transition-colors',
        value ? 'bg-[#111827]' : 'bg-[#d1d5db]'
      )}
    >
      <span className={clsx(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
        value ? 'left-[18px]' : 'left-0.5'
      )} />
    </button>
  </div>
);

/** Text input */
const TextField = ({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-[12px] text-[#6b7280] font-medium mb-1.5 block">{label}</label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full text-[13px] border border-[#d1d5db] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#111827] placeholder-[#9ca3af]"
    />
  </div>
);

/** Textarea */
const TextArea = ({ label, value, placeholder, rows = 3, onChange }: {
  label: string; value: string; placeholder?: string; rows?: number; onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-[12px] text-[#6b7280] font-medium mb-1.5 block">{label}</label>
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={e => onChange(e.target.value)}
      className="w-full text-[13px] border border-[#d1d5db] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#111827] placeholder-[#9ca3af] resize-y"
    />
  </div>
);

/** Image upload field with preview, upload button, URL input, and remove */
const ImageUploadField = ({ label, value, helpText, onChange }: {
  label: string; value: string; helpText?: string; onChange: (v: string) => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const API_BASE = (import.meta.env.VITE_API_BACKEND_URL as string | undefined)?.replace(/\/api\/?$/, '') ?? '';
    const token = localStorage.getItem('backend_access_token') || localStorage.getItem('warehouse_access_token') || '';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json() as { url?: string };
        if (data.url) onChange(data.url);
      }
    } catch {
      onChange(URL.createObjectURL(file));
    }
  };

  return (
    <div>
      <label className="text-[12px] text-[#6b7280] font-medium mb-1.5 block">{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-[#e5e7eb] bg-[#f9fafb] mb-2">
          <img src={value} alt={label} className="w-full h-20 object-contain p-2" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-[#e5e7eb] rounded-lg p-4 text-center cursor-pointer hover:border-[#9ca3af] hover:bg-[#f9fafb] transition-all mb-2"
        >
          <Upload size={18} className="mx-auto text-[#9ca3af] mb-1" />
          <p className="text-[12px] text-[#9ca3af]">Upload image</p>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://..."
        className="w-full text-[12px] border border-[#d1d5db] rounded-lg px-3 py-1.5 text-[#111827] focus:outline-none focus:border-[#111827] placeholder-[#9ca3af]"
      />
      {helpText && <p className="text-[11px] text-[#9ca3af] mt-1">{helpText}</p>}
    </div>
  );
};

/** Description text */
const Desc = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] text-[#9ca3af] leading-relaxed -mt-1">{children}</p>
);

/* ─────────────────────────────────────────────────────────────────────────
   Color Scheme components
───────────────────────────────────────────────────────────────────────── */

/** Mini "Aa" preview tile for a color scheme */
const SchemePreview = ({ scheme, selected, onClick }: { scheme: ColorScheme; selected: boolean; onClick: () => void }) => {
  const isDark = isColorDark(scheme.background);
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-1 min-w-0 transition-all',
      )}
    >
      <div
        className={clsx(
          'w-full aspect-[4/3] rounded-lg flex flex-col items-center justify-center gap-1 border-2 transition-all',
          selected ? 'border-[#3B82F6] shadow-[0_0_0_1px_#3B82F6]' : 'border-[#e5e7eb] hover:border-[#9ca3af]',
        )}
        style={{ backgroundColor: scheme.background }}
      >
        <span className="text-[18px] font-serif font-bold leading-none" style={{ color: scheme.text }}>Aa</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-[7px] rounded-full" style={{ backgroundColor: scheme.solidButtonBg }} />
          <span className="w-3 h-[7px] rounded-full border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)', backgroundColor: 'transparent' }} />
        </div>
      </div>
      <span className="text-[10px] text-[#6b7280] truncate w-full text-center">{scheme.name}</span>
    </button>
  );
};

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

/** Scheme editor slide-up panel */
const SchemeEditor = ({ scheme, onChange, onRemove, onClose }: {
  scheme: ColorScheme;
  onChange: (updated: ColorScheme) => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  const isDark = isColorDark(scheme.background);

  const updateField = (field: keyof ColorScheme, value: string) => {
    onChange({ ...scheme, [field]: value });
  };

  return (
    <div className="border-t border-[#e5e7eb] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">Editing {scheme.name}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6]">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scheme preview tile */}
      <div className="px-4 pt-3 pb-2">
        <div
          className="rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 border border-[#e5e7eb]"
          style={{ backgroundColor: scheme.background }}
        >
          <span className="text-[28px] font-serif font-bold leading-none" style={{ color: scheme.text }}>Aa</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-[9px] rounded-full" style={{ backgroundColor: scheme.solidButtonBg }} />
            <span className="w-5 h-[9px] rounded-full border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)', backgroundColor: 'transparent' }} />
          </div>
        </div>
        <p className="text-[11px] text-[#9ca3af] mt-2 leading-relaxed">
          Editing this scheme's colors will affect all sections that use this scheme.
        </p>
      </div>

      {/* Color fields */}
      <div className="px-4 pb-4 space-y-3 pt-2">
        <ColorField label="Background" value={scheme.background} onChange={v => updateField('background', v)} />
        <div>
          <div className="flex items-center gap-2.5">
            <label className="relative w-8 h-8 rounded-lg border border-[#e5e7eb] overflow-hidden flex-shrink-0 cursor-pointer">
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                {!scheme.backgroundGradient && <span className="text-[10px] text-[#9ca3af] rotate-45">/</span>}
              </div>
            </label>
            <span className="flex-1 text-[13px] text-[#374151]">Background gradient</span>
            <span className="text-[11px] text-[#9ca3af]">{scheme.backgroundGradient || 'No color chosen'}</span>
          </div>
          <p className="text-[11px] text-[#9ca3af] mt-1 ml-[42px]">Background gradient replaces background where possible.</p>
        </div>
        <ColorField label="Text" value={scheme.text} onChange={v => updateField('text', v)} />
        <ColorField label="Solid button background" value={scheme.solidButtonBg} onChange={v => updateField('solidButtonBg', v)} />
        <ColorField label="Solid button label" value={scheme.solidButtonLabel} onChange={v => updateField('solidButtonLabel', v)} />
        <ColorField label="Outline button" value={scheme.outlineButton} onChange={v => updateField('outlineButton', v)} />
        <ColorField label="Shadow" value={scheme.shadow} onChange={v => updateField('shadow', v)} />
      </div>

      {/* Remove scheme */}
      <div className="px-4 pb-4 border-t border-[#e5e7eb] pt-3">
        <button
          type="button"
          onClick={onRemove}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-[#991B1B] hover:bg-red-50 rounded-lg transition-colors"
        >
          <span className="material-icons" style={{ fontSize: '14px' }}>delete_outline</span>
          Remove color scheme
        </button>
      </div>
    </div>
  );
};

/** Full Colors accordion with scheme grid + editor */
const ColorsAccordion = ({ theme, set, setMulti, isOpen, onToggle }: {
  theme: SiteTheme;
  set: <K extends keyof SiteTheme>(key: K, value: SiteTheme[K]) => void;
  setMulti: (patch: Partial<SiteTheme>) => void;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const schemes = theme.colorSchemes ?? DEFAULT_COLOR_SCHEMES;
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateScheme = (updated: ColorScheme) => {
    const next = schemes.map(s => s.id === updated.id ? updated : s);
    set('colorSchemes', next);
  };

  const removeScheme = (id: string) => {
    if (schemes.length <= 1) return;
    set('colorSchemes', schemes.filter(s => s.id !== id));
    setEditingId(null);
  };

  const addScheme = () => {
    const num = schemes.length + 1;
    const newScheme: ColorScheme = {
      id: `scheme-${Date.now()}`,
      name: `Scheme ${num}`,
      background: '#FFFFFF',
      backgroundGradient: '',
      text: '#121212',
      solidButtonBg: '#121212',
      solidButtonLabel: '#FFFFFF',
      outlineButton: '#121212',
      shadow: '#121212',
    };
    set('colorSchemes', [...schemes, newScheme]);
    setEditingId(newScheme.id);
  };

  const editingScheme = editingId ? schemes.find(s => s.id === editingId) : null;

  return (
    <Accordion label="Colors" isOpen={isOpen} onToggle={onToggle}>
      {/* Schemes section */}
      <div className="space-y-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[#111827] mb-1">Schemes</h3>
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">Color schemes can be applied to sections throughout your online store.</p>
        </div>

        {/* Scheme grid */}
        <div className="grid grid-cols-3 gap-2">
          {schemes.map((s) => (
            <SchemePreview
              key={s.id}
              scheme={s}
              selected={editingId === s.id}
              onClick={() => setEditingId(editingId === s.id ? null : s.id)}
            />
          ))}
          {/* Add scheme */}
          <button
            type="button"
            onClick={addScheme}
            className="flex flex-col items-center justify-center gap-1"
          >
            <div className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-[#3B82F6]/40 flex items-center justify-center hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 transition-all">
              <span className="text-[20px] text-[#3B82F6]/60">+</span>
            </div>
            <span className="text-[10px] text-[#3B82F6] font-medium">Add Scheme</span>
          </button>
        </div>
      </div>

      {/* Scheme editor (shown when a scheme is selected) */}
      {editingScheme && (
        <SchemeEditor
          key={editingScheme.id}
          scheme={editingScheme}
          onChange={updateScheme}
          onRemove={() => removeScheme(editingScheme.id)}
          onClose={() => setEditingId(null)}
        />
      )}


    </Accordion>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ThemePanel
───────────────────────────────────────────────────────────────────────── */
const ThemePanel = ({ onClose, onSave }: Props) => {
  const { theme, updateTheme, resetTheme } = useTheme();

  /* Debounce saves so rapid interactions don't spam the API */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = useCallback(<K extends keyof SiteTheme>(key: K, value: SiteTheme[K]) => {
    const patch = { [key]: value } as Partial<SiteTheme>;
    const next = { ...theme, ...patch };
    updateTheme(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave?.(next), 800);
  }, [theme, updateTheme, onSave]);

  /** Shorthand for setting multiple keys */
  const setMulti = useCallback((patch: Partial<SiteTheme>) => {
    const next = { ...theme, ...patch };
    updateTheme(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave?.(next), 800);
  }, [theme, updateTheme, onSave]);

  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const fontOptions = FONT_OPTIONS.map(f => ({ value: f, label: f }));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-[#e5e7eb]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb] flex-shrink-0">
        <h2 className="text-[15px] font-semibold text-[#111827]">Theme settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Scrollable accordion body ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ─ Logo ─ */}
        <Accordion label="Logo" isOpen={openAccordion === 'Logo'} onToggle={() => setOpenAccordion(prev => prev === 'Logo' ? null : 'Logo')}>
          <ImageUploadField label="Logo image" value={theme.logoUrl} helpText="Recommended: 200px wide, transparent PNG" onChange={v => set('logoUrl', v)} />
          <RangeField label="Logo width" value={theme.logoWidth} min={50} max={300} unit="px" onChange={v => set('logoWidth', v)} />
          <div className="border-t border-[#f3f4f6] pt-3.5 mt-1">
            <ImageUploadField label="Favicon" value={theme.faviconUrl} helpText="32x32 or 64x64 PNG. Shows in browser tab." onChange={v => set('faviconUrl', v)} />
          </div>
        </Accordion>

        {/* ─ Colors ─ */}
        <ColorsAccordion theme={theme} set={set} setMulti={setMulti} isOpen={openAccordion === 'Colors'} onToggle={() => setOpenAccordion(prev => prev === 'Colors' ? null : 'Colors')} />

        {/* ─ Typography ─ */}
        <Accordion label="Typography" isOpen={openAccordion === 'Typography'} onToggle={() => setOpenAccordion(prev => prev === 'Typography' ? null : 'Typography')}>
          <SelectField label="Heading font" value={theme.fontHeading} options={fontOptions} onChange={v => set('fontHeading', v)} />
          <RangeField label="Heading scale" value={theme.headingScale} min={80} max={150} unit="%" onChange={v => set('headingScale', v)} />
          <SelectField label="Body font" value={theme.fontBody} options={fontOptions} onChange={v => set('fontBody', v)} />
          <RangeField label="Body scale" value={theme.bodyScale} min={80} max={150} unit="%" onChange={v => set('bodyScale', v)} />
        </Accordion>

        {/* ─ Layout ─ */}
        <Accordion label="Layout" isOpen={openAccordion === 'Layout'} onToggle={() => setOpenAccordion(prev => prev === 'Layout' ? null : 'Layout')}>
          <RangeField label="Page width" value={theme.pageWidth} min={1000} max={1600} step={20} unit="px" onChange={v => set('pageWidth', v)} />
          <ButtonGroup
            label="Spacing"
            value={theme.spacing}
            options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'spacious', label: 'Spacious' }]}
            onChange={v => set('spacing', v)}
          />
          <RangeField label="Section vertical padding" value={theme.sectionPadding} min={20} max={120} step={4} unit="px" onChange={v => set('sectionPadding', v)} />
        </Accordion>

        {/* ─ Animations ─ */}
        <Accordion label="Animations" isOpen={openAccordion === 'Animations'} onToggle={() => setOpenAccordion(prev => prev === 'Animations' ? null : 'Animations')}>
          <Toggle label="Reveal on scroll" value={theme.revealOnScroll} onChange={v => set('revealOnScroll', v)} />
          <SelectField
            label="Animation style"
            value={theme.animationStyle}
            options={[
              { value: 'fade-up', label: 'Fade up' },
              { value: 'fade-in', label: 'Fade in' },
              { value: 'slide-left', label: 'Slide left' },
              { value: 'slide-right', label: 'Slide right' },
              { value: 'zoom-in', label: 'Zoom in' },
              { value: 'none', label: 'None' },
            ]}
            onChange={v => set('animationStyle', v as SiteTheme['animationStyle'])}
          />
          <RangeField label="Duration" value={theme.animationDuration} min={100} max={1000} step={50} unit="ms" onChange={v => set('animationDuration', v)} />
          <Toggle label="Hover effects" value={theme.hoverEffects} onChange={v => set('hoverEffects', v)} />
        </Accordion>

        {/* ─ Buttons ─ */}
        <Accordion label="Buttons" isOpen={openAccordion === 'Buttons'} onToggle={() => setOpenAccordion(prev => prev === 'Buttons' ? null : 'Buttons')}>
          <ButtonGroup
            label="Border radius"
            value={theme.borderRadius}
            options={[{ value: 'sharp', label: 'Sharp' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }]}
            onChange={v => set('borderRadius', v)}
          />
          <SelectField
            label="Shadow"
            value={theme.buttonShadow}
            options={[{ value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
            onChange={v => set('buttonShadow', v as SiteTheme['buttonShadow'])}
          />
          <ButtonGroup
            label="Padding"
            value={theme.buttonPadding}
            options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
            onChange={v => set('buttonPadding', v)}
          />
          {/* Live button preview */}
          <div className="bg-[#f9fafb] rounded-lg p-4 flex gap-2 justify-center">
            <button
              type="button"
              className="text-[13px] font-medium transition-all"
              style={{
                background: (theme.colorSchemes?.[0]?.solidButtonBg || '#121212'),
                color: (theme.colorSchemes?.[0]?.solidButtonLabel || '#FFFFFF'),
                padding: theme.buttonPadding === 'small' ? '8px 16px' : theme.buttonPadding === 'large' ? '14px 28px' : '10px 22px',
                borderRadius: theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'rounded' ? '8px' : '9999px',
                border: 'none',
              }}
            >
              Primary
            </button>
            <button
              type="button"
              className="text-[13px] font-medium transition-all"
              style={{
                background: 'transparent',
                color: (theme.colorSchemes?.[0]?.outlineButton || '#121212'),
                padding: theme.buttonPadding === 'small' ? '8px 16px' : theme.buttonPadding === 'large' ? '14px 28px' : '10px 22px',
                borderRadius: theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'rounded' ? '8px' : '9999px',
                border: `1.5px solid ${(theme.colorSchemes?.[0]?.outlineButton || '#121212')}`,
              }}
            >
              Secondary
            </button>
          </div>
        </Accordion>

        {/* ─ Variant pills ─ */}
        <Accordion label="Variant pills" isOpen={openAccordion === 'Variant pills'} onToggle={() => setOpenAccordion(prev => prev === 'Variant pills' ? null : 'Variant pills')}>
          <ButtonGroup
            label="Style"
            value={theme.variantStyle}
            options={[{ value: 'pill', label: 'Pill' }, { value: 'rectangle', label: 'Rectangle' }, { value: 'circle', label: 'Circle' }]}
            onChange={v => set('variantStyle', v)}
          />
        </Accordion>

        {/* ─ Inputs ─ */}
        <Accordion label="Inputs" isOpen={openAccordion === 'Inputs'} onToggle={() => setOpenAccordion(prev => prev === 'Inputs' ? null : 'Inputs')}>
          <RangeField label="Border radius" value={theme.inputBorderRadius} min={0} max={24} unit="px" onChange={v => set('inputBorderRadius', v)} />
          <ColorField label="Border color" value={theme.inputBorderColor} onChange={v => set('inputBorderColor', v)} />
          {/* Live preview */}
          <div className="bg-[#f9fafb] rounded-lg p-4">
            <input
              type="text"
              placeholder="Example input..."
              readOnly
              className="w-full text-[13px] px-3 py-2.5 outline-none"
              style={{
                border: `1px solid ${theme.inputBorderColor}`,
                borderRadius: `${theme.inputBorderRadius}px`,
                fontFamily: 'inherit',
              }}
            />
          </div>
        </Accordion>

        {/* ─ Product cards ─ */}
        <Accordion label="Product cards" isOpen={openAccordion === 'Product cards'} onToggle={() => setOpenAccordion(prev => prev === 'Product cards' ? null : 'Product cards')}>
          <ButtonGroup
            label="Style"
            value={theme.productCardStyle}
            options={[{ value: 'standard', label: 'Standard' }, { value: 'card', label: 'Card' }, { value: 'minimal', label: 'Minimal' }]}
            onChange={v => set('productCardStyle', v)}
          />
          <SelectField
            label="Image ratio"
            value={theme.productImageRatio}
            options={[{ value: 'adapt', label: 'Adapt to image' }, { value: 'portrait', label: 'Portrait (2:3)' }, { value: 'square', label: 'Square (1:1)' }]}
            onChange={v => set('productImageRatio', v as SiteTheme['productImageRatio'])}
          />
          <ButtonGroup
            label="Text alignment"
            value={theme.productTextAlign}
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]}
            onChange={v => set('productTextAlign', v)}
          />
          <Toggle label="Show secondary image on hover" value={theme.productShowSecondaryImage} onChange={v => set('productShowSecondaryImage', v)} />
          <Toggle label="Show vendor" value={theme.productShowVendor} onChange={v => set('productShowVendor', v)} />
        </Accordion>

        {/* ─ Collection cards ─ */}
        <Accordion label="Collection cards" isOpen={openAccordion === 'Collection cards'} onToggle={() => setOpenAccordion(prev => prev === 'Collection cards' ? null : 'Collection cards')}>
          <ButtonGroup
            label="Style"
            value={theme.collectionCardStyle}
            options={[{ value: 'standard', label: 'Standard' }, { value: 'card', label: 'Card' }]}
            onChange={v => set('collectionCardStyle', v)}
          />
          <SelectField
            label="Image ratio"
            value={theme.collectionImageRatio}
            options={[{ value: 'adapt', label: 'Adapt to image' }, { value: 'portrait', label: 'Portrait (2:3)' }, { value: 'square', label: 'Square (1:1)' }]}
            onChange={v => set('collectionImageRatio', v as SiteTheme['collectionImageRatio'])}
          />
        </Accordion>

        {/* ─ Blog cards ─ */}
        <Accordion label="Blog cards" isOpen={openAccordion === 'Blog cards'} onToggle={() => setOpenAccordion(prev => prev === 'Blog cards' ? null : 'Blog cards')}>
          <ButtonGroup
            label="Style"
            value={theme.blogCardStyle}
            options={[{ value: 'standard', label: 'Standard' }, { value: 'card', label: 'Card' }]}
            onChange={v => set('blogCardStyle', v)}
          />
          <Toggle label="Show date" value={theme.blogShowDate} onChange={v => set('blogShowDate', v)} />
          <Toggle label="Show author" value={theme.blogShowAuthor} onChange={v => set('blogShowAuthor', v)} />
        </Accordion>

        {/* ─ Content containers ─ */}
        <Accordion label="Content containers" isOpen={openAccordion === 'Content containers'} onToggle={() => setOpenAccordion(prev => prev === 'Content containers' ? null : 'Content containers')}>
          <RangeField label="Border radius" value={theme.containerBorderRadius} min={0} max={24} unit="px" onChange={v => set('containerBorderRadius', v)} />
          <SelectField
            label="Shadow"
            value={theme.containerShadow}
            options={[{ value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }]}
            onChange={v => set('containerShadow', v as SiteTheme['containerShadow'])}
          />
        </Accordion>

        {/* ─ Media ─ */}
        <Accordion label="Media" isOpen={openAccordion === 'Media'} onToggle={() => setOpenAccordion(prev => prev === 'Media' ? null : 'Media')}>
          <RangeField label="Border radius" value={theme.mediaBorderRadius} min={0} max={24} unit="px" onChange={v => set('mediaBorderRadius', v)} />
          <SelectField
            label="Shadow"
            value={theme.mediaShadow}
            options={[{ value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }]}
            onChange={v => set('mediaShadow', v as SiteTheme['mediaShadow'])}
          />
        </Accordion>

        {/* ─ Dropdowns and pop-ups ─ */}
        <Accordion label="Dropdowns and pop-ups" isOpen={openAccordion === 'Dropdowns and pop-ups'} onToggle={() => setOpenAccordion(prev => prev === 'Dropdowns and pop-ups' ? null : 'Dropdowns and pop-ups')}>
          <RangeField label="Border radius" value={theme.dropdownBorderRadius} min={0} max={24} unit="px" onChange={v => set('dropdownBorderRadius', v)} />
          <SelectField
            label="Shadow"
            value={theme.dropdownShadow}
            options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
            onChange={v => set('dropdownShadow', v as SiteTheme['dropdownShadow'])}
          />
        </Accordion>

        {/* ─ Drawers ─ */}
        <Accordion label="Drawers" isOpen={openAccordion === 'Drawers'} onToggle={() => setOpenAccordion(prev => prev === 'Drawers' ? null : 'Drawers')}>
          <RangeField label="Border radius" value={theme.drawerBorderRadius} min={0} max={24} unit="px" onChange={v => set('drawerBorderRadius', v)} />
        </Accordion>

        {/* ─ Badges ─ */}
        <Accordion label="Badges" isOpen={openAccordion === 'Badges'} onToggle={() => setOpenAccordion(prev => prev === 'Badges' ? null : 'Badges')}>
          <ButtonGroup
            label="Position"
            value={theme.badgePosition}
            options={[{ value: 'top-left', label: 'Top left' }, { value: 'top-right', label: 'Top right' }, { value: 'bottom-left', label: 'Bottom left' }]}
            onChange={v => set('badgePosition', v)}
          />
          <ButtonGroup
            label="Shape"
            value={theme.badgeShape}
            options={[{ value: 'rectangle', label: 'Rectangle' }, { value: 'pill', label: 'Pill' }]}
            onChange={v => set('badgeShape', v)}
          />
          <ColorField label="Sale badge color" value={theme.saleBadgeColor} onChange={v => set('saleBadgeColor', v)} />
        </Accordion>

        {/* ─ Brand information ─ */}
        <Accordion label="Brand information" isOpen={openAccordion === 'Brand information'} onToggle={() => setOpenAccordion(prev => prev === 'Brand information' ? null : 'Brand information')}>
          <TextField label="Brand name" value={theme.brandName} placeholder="Your brand name" onChange={v => set('brandName', v)} />
          <TextArea label="Brand description" value={theme.brandDescription} placeholder="Short brand description..." onChange={v => set('brandDescription', v)} />
        </Accordion>

        {/* ─ Social media ─ */}
        <Accordion label="Social media" isOpen={openAccordion === 'Social media'} onToggle={() => setOpenAccordion(prev => prev === 'Social media' ? null : 'Social media')}>
          <Desc>Links shown in the footer and social sections</Desc>
          <TextField label="Instagram" value={theme.socialInstagram} placeholder="https://instagram.com/..." onChange={v => set('socialInstagram', v)} />
          <TextField label="X (Twitter)" value={theme.socialTwitter} placeholder="https://x.com/..." onChange={v => set('socialTwitter', v)} />
          <TextField label="TikTok" value={theme.socialTiktok} placeholder="https://tiktok.com/@..." onChange={v => set('socialTiktok', v)} />
          <TextField label="Facebook" value={theme.socialFacebook} placeholder="https://facebook.com/..." onChange={v => set('socialFacebook', v)} />
          <TextField label="YouTube" value={theme.socialYoutube} placeholder="https://youtube.com/@..." onChange={v => set('socialYoutube', v)} />
          <TextField label="Snapchat" value={theme.socialSnapchat} placeholder="https://snapchat.com/add/..." onChange={v => set('socialSnapchat', v)} />
        </Accordion>

        {/* ─ Search behavior ─ */}
        <Accordion label="Search behavior" isOpen={openAccordion === 'Search behavior'} onToggle={() => setOpenAccordion(prev => prev === 'Search behavior' ? null : 'Search behavior')}>
          <Toggle label="Enable search" value={theme.searchEnabled} onChange={v => set('searchEnabled', v)} />
          <Toggle label="Show product suggestions" value={theme.searchShowSuggestions} onChange={v => set('searchShowSuggestions', v)} />
        </Accordion>

        {/* ─ Currency format ─ */}
        <Accordion label="Currency format" isOpen={openAccordion === 'Currency format'} onToggle={() => setOpenAccordion(prev => prev === 'Currency format' ? null : 'Currency format')}>
          <SelectField
            label="Currency"
            value={theme.currency}
            options={CURRENCY_OPTIONS.map(c => ({ value: c.code, label: c.label }))}
            onChange={v => set('currency', v)}
          />
          <ButtonGroup
            label="Format"
            value={theme.currencyPosition}
            options={[
              { value: 'prefix', label: `${theme.currency} 100` },
              { value: 'suffix', label: `100 ${theme.currency}` },
            ]}
            onChange={v => set('currencyPosition', v)}
          />
        </Accordion>

        {/* ─ Cart ─ */}
        <Accordion label="Cart" isOpen={openAccordion === 'Cart'} onToggle={() => setOpenAccordion(prev => prev === 'Cart' ? null : 'Cart')}>
          <ButtonGroup
            label="Cart type"
            value={theme.cartType}
            options={[{ value: 'drawer', label: 'Drawer' }, { value: 'page', label: 'Page' }, { value: 'popup', label: 'Pop-up' }]}
            onChange={v => set('cartType', v)}
          />
          <Toggle label="Show cart note" value={theme.cartShowNote} onChange={v => set('cartShowNote', v)} />
        </Accordion>

        {/* ─ Checkout ─ */}
        <Accordion label="Checkout" isOpen={openAccordion === 'Checkout'} onToggle={() => setOpenAccordion(prev => prev === 'Checkout' ? null : 'Checkout')}>
          <ColorField label="Accent color" value={theme.checkoutAccentColor} onChange={v => set('checkoutAccentColor', v)} />
          <TextField label="Checkout button text" value={theme.checkoutButtonText} placeholder="Complete order" onChange={v => set('checkoutButtonText', v)} />
        </Accordion>

        {/* ─ Custom CSS ─ */}
        <Accordion label="Custom CSS" isOpen={openAccordion === 'Custom CSS'} onToggle={() => setOpenAccordion(prev => prev === 'Custom CSS' ? null : 'Custom CSS')}>
          <Desc>Add custom styles. Use caution as incorrect CSS may break your storefront.</Desc>
          <textarea
            value={theme.customCss}
            onChange={e => set('customCss', e.target.value)}
            placeholder={'/* Your custom CSS here */\n.xd-section { }\n.xd-card { }'}
            rows={6}
            className="w-full text-[12px] font-mono leading-relaxed border border-[#d1d5db] rounded-lg px-3 py-2.5 text-[#111827] bg-[#f9fafb] focus:outline-none focus:border-[#111827] resize-y placeholder-[#9ca3af]"
          />
        </Accordion>

      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[#e5e7eb] flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            resetTheme();
            onSave?.(DEFAULT_THEME);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium text-[#6b7280] border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] transition-colors"
        >
          <span className="material-icons" style={{ fontSize: '14px' }}>restart_alt</span>
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

export default ThemePanel;
