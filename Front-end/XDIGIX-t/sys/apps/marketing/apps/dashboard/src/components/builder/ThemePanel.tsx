import { useCallback, useRef } from 'react';
import { useTheme, FONT_OPTIONS, DEFAULT_THEME, SiteTheme } from '../../contexts/ThemeContext';

interface Props {
  onClose: () => void;
  onSave?: (theme: SiteTheme) => void;
}

const COLOR_FIELDS: Array<{ key: keyof SiteTheme; label: string }> = [
  { key: 'colorPrimary',   label: 'Primary'   },
  { key: 'colorSecondary', label: 'Secondary' },
  { key: 'colorAccent',    label: 'Accent'    },
  { key: 'colorBg',        label: 'Background'},
  { key: 'colorText',      label: 'Text'      },
];

const ThemePanel = ({ onClose, onSave }: Props) => {
  const { theme, updateTheme, resetTheme } = useTheme();

  /* Debounce saves so rapid color-picker drags don't spam the API */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleThemeSave = useCallback((patch: Partial<SiteTheme>) => {
    const next = { ...theme, ...patch };
    updateTheme(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave?.(next), 800);
  }, [theme, updateTheme, onSave]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-icons text-primary text-lg">palette</span>
          <h2 className="text-sm font-semibold text-gray-800">Global Theme</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Close Theme Panel"
        >
          <span className="material-icons text-base text-gray-500">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ── Colors ─────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Colors</h3>
          <div className="space-y-3">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700 flex-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme[key] as string}
                    onChange={(e) => scheduleThemeSave({ [key]: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
                    style={{ background: 'none' }}
                  />
                  <input
                    type="text"
                    value={theme[key] as string}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) scheduleThemeSave({ [key]: v });
                    }}
                    className="w-24 text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    maxLength={7}
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Typography ─────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Typography</h3>
          <div className="space-y-3">
            {([['fontHeading', 'Heading Font'], ['fontBody', 'Body Font']] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <select
                  value={theme[key]}
                  onChange={(e) => scheduleThemeSave({ [key]: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* ── Border Radius ──────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Border Radius</h3>
          <div className="flex gap-2">
            {(['sharp', 'rounded', 'pill'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => scheduleThemeSave({ borderRadius: v })}
                className={`flex-1 py-2 text-xs font-medium border rounded-lg transition-colors capitalize ${
                  theme.borderRadius === v
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary/40'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Visual preview */}
          <div className="mt-3 flex gap-3 items-center justify-center">
            {(['sharp', 'rounded', 'pill'] as const).map((v) => (
              <div
                key={v}
                className={`h-8 w-16 border-2 transition-all ${
                  v === 'sharp'   ? 'rounded-none' :
                  v === 'rounded' ? 'rounded-lg'   : 'rounded-full'
                } ${theme.borderRadius === v ? 'border-primary bg-primary/10' : 'border-gray-200'}`}
              />
            ))}
          </div>
        </section>

        {/* ── Spacing ────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Spacing</h3>
          <div className="flex gap-2">
            {(['compact', 'normal', 'spacious'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => scheduleThemeSave({ spacing: v })}
                className={`flex-1 py-2 text-xs font-medium border rounded-lg transition-colors capitalize ${
                  theme.spacing === v
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary/40'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* Footer — Reset */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            resetTheme();
            onSave?.(DEFAULT_THEME);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span className="material-icons text-sm">restart_alt</span>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default ThemePanel;
