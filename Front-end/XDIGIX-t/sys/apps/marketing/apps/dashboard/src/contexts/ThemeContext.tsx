import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   SiteTheme — design-token schema stored in site.settings.theme
───────────────────────────────────────────────────────────────────────── */
export interface SiteTheme {
  colorPrimary:   string;
  colorSecondary: string;
  colorAccent:    string;
  colorBg:        string;
  colorText:      string;
  fontHeading:    string;
  fontBody:       string;
  borderRadius:   'sharp' | 'rounded' | 'pill';
  spacing:        'compact' | 'normal' | 'spacious';
}

export const DEFAULT_THEME: SiteTheme = {
  colorPrimary:   '#27491F',
  colorSecondary: '#F0CAE1',
  colorAccent:    '#FFD300',
  colorBg:        '#ffffff',
  colorText:      '#1f2937',
  fontHeading:    'Inter',
  fontBody:       'Inter',
  borderRadius:   'rounded',
  spacing:        'normal',
};

/* Maps for CSS var generation */
export const RADIUS_MAP: Record<SiteTheme['borderRadius'], string> = {
  sharp:   '0px',
  rounded: '8px',
  pill:    '9999px',
};

export const SPACING_MAP: Record<SiteTheme['spacing'], string> = {
  compact:  '0.75rem',
  normal:   '1rem',
  spacious: '1.5rem',
};

export const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Poppins',
  'Montserrat',
  'Nunito',
] as const;

/* Generates the <style> tag content for CSS custom properties */
export function buildThemeCssVars(theme: SiteTheme): string {
  return `
:root {
  --c-primary:    ${theme.colorPrimary};
  --c-secondary:  ${theme.colorSecondary};
  --c-accent:     ${theme.colorAccent};
  --c-bg:         ${theme.colorBg};
  --c-text:       ${theme.colorText};
  --font-heading: '${theme.fontHeading}', system-ui, sans-serif;
  --font-body:    '${theme.fontBody}', system-ui, sans-serif;
  --radius:       ${RADIUS_MAP[theme.borderRadius]};
  --spacing-unit: ${SPACING_MAP[theme.spacing]};
}`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Context
───────────────────────────────────────────────────────────────────────── */
interface ThemeContextValue {
  theme: SiteTheme;
  updateTheme: (patch: Partial<SiteTheme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Partial<SiteTheme>;
}

export const ThemeProvider = ({ children, initialTheme }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<SiteTheme>({
    ...DEFAULT_THEME,
    ...initialTheme,
  });

  const updateTheme = useCallback((patch: Partial<SiteTheme>) => {
    setTheme((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};
