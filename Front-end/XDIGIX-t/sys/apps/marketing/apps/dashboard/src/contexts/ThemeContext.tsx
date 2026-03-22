import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   SiteTheme — comprehensive design-token schema stored in site.settings.theme
───────────────────────────────────────────────────────────────────────── */
/* ── Color Scheme ─────────────────────────────────────────────────────── */
export interface ColorScheme {
  id: string;
  name: string;
  background: string;
  backgroundGradient: string;     // empty = no gradient
  text: string;
  solidButtonBg: string;
  solidButtonLabel: string;
  outlineButton: string;
  shadow: string;
}

export const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'scheme-1',
    name: 'Scheme 1',
    background: '#FFFFFF',
    backgroundGradient: '',
    text: '#121212',
    solidButtonBg: '#121212',
    solidButtonLabel: '#FFFFFF',
    outlineButton: '#121212',
    shadow: '#121212',
  },
  {
    id: 'scheme-2',
    name: 'Scheme 2',
    background: '#F3F3F3',
    backgroundGradient: '',
    text: '#121212',
    solidButtonBg: '#121212',
    solidButtonLabel: '#FFFFFF',
    outlineButton: '#121212',
    shadow: '#121212',
  },
  {
    id: 'scheme-3',
    name: 'Scheme 3',
    background: '#242833',
    backgroundGradient: '',
    text: '#FFFFFF',
    solidButtonBg: '#FFFFFF',
    solidButtonLabel: '#000000',
    outlineButton: '#FFFFFF',
    shadow: '#121212',
  },
  {
    id: 'scheme-4',
    name: 'Scheme 4',
    background: '#121212',
    backgroundGradient: '',
    text: '#FFFFFF',
    solidButtonBg: '#FFFFFF',
    solidButtonLabel: '#121212',
    outlineButton: '#FFFFFF',
    shadow: '#121212',
  },
  {
    id: 'scheme-5',
    name: 'Scheme 5',
    background: '#3B3F8C',
    backgroundGradient: '',
    text: '#FFFFFF',
    solidButtonBg: '#FFFFFF',
    solidButtonLabel: '#3B3F8C',
    outlineButton: '#FFFFFF',
    shadow: '#121212',
  },
];

export interface SiteTheme {
  /* ── Color Schemes ──────────────────────────────────────────────────── */
  colorSchemes: ColorScheme[];

  /* ── Colors (legacy / global) ──────────────────────────────────────── */
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
  colorSolidButtonLabel: string;

  /* ── Typography ─────────────────────────────────────────────────────── */
  fontHeading: string;
  fontBody: string;
  headingScale: number;   // percentage, e.g. 100
  bodyScale: number;      // percentage, e.g. 100

  /* ── Layout ─────────────────────────────────────────────────────────── */
  pageWidth: number;            // px, e.g. 1200
  spacing: 'compact' | 'normal' | 'spacious';
  sectionPadding: number;       // px, e.g. 60

  /* ── Animations ─────────────────────────────────────────────────────── */
  revealOnScroll: boolean;
  animationStyle: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'zoom-in' | 'none';
  animationDuration: number;    // ms, e.g. 400
  hoverEffects: boolean;

  /* ── Buttons ────────────────────────────────────────────────────────── */
  borderRadius: 'sharp' | 'rounded' | 'pill';
  buttonShadow: 'none' | 'small' | 'medium' | 'large';
  buttonPadding: 'small' | 'medium' | 'large';

  /* ── Variant pills ──────────────────────────────────────────────────── */
  variantStyle: 'pill' | 'rectangle' | 'circle';

  /* ── Inputs ─────────────────────────────────────────────────────────── */
  inputBorderRadius: number;    // px
  inputBorderColor: string;

  /* ── Product cards ──────────────────────────────────────────────────── */
  productCardStyle: 'standard' | 'card' | 'minimal';
  productImageRatio: 'adapt' | 'portrait' | 'square';
  productTextAlign: 'left' | 'center';
  productShowSecondaryImage: boolean;
  productShowVendor: boolean;

  /* ── Collection cards ───────────────────────────────────────────────── */
  collectionCardStyle: 'standard' | 'card';
  collectionImageRatio: 'adapt' | 'portrait' | 'square';

  /* ── Blog cards ─────────────────────────────────────────────────────── */
  blogCardStyle: 'standard' | 'card';
  blogShowDate: boolean;
  blogShowAuthor: boolean;

  /* ── Content containers ─────────────────────────────────────────────── */
  containerBorderRadius: number;
  containerShadow: 'none' | 'small' | 'medium';

  /* ── Media ──────────────────────────────────────────────────────────── */
  mediaBorderRadius: number;
  mediaShadow: 'none' | 'small' | 'medium';

  /* ── Dropdowns & pop-ups ────────────────────────────────────────────── */
  dropdownBorderRadius: number;
  dropdownShadow: 'small' | 'medium' | 'large';

  /* ── Drawers ────────────────────────────────────────────────────────── */
  drawerBorderRadius: number;

  /* ── Badges ─────────────────────────────────────────────────────────── */
  badgePosition: 'top-left' | 'top-right' | 'bottom-left';
  badgeShape: 'rectangle' | 'pill';
  saleBadgeColor: string;

  /* ── Brand information ──────────────────────────────────────────────── */
  brandName: string;
  brandDescription: string;

  /* ── Social media ───────────────────────────────────────────────────── */
  socialInstagram: string;
  socialTwitter: string;
  socialTiktok: string;
  socialFacebook: string;
  socialYoutube: string;
  socialSnapchat: string;

  /* ── Search behavior ────────────────────────────────────────────────── */
  searchEnabled: boolean;
  searchShowSuggestions: boolean;

  /* ── Currency format ────────────────────────────────────────────────── */
  currency: string;
  currencyPosition: 'prefix' | 'suffix';

  /* ── Cart ────────────────────────────────────────────────────────────── */
  cartType: 'drawer' | 'page' | 'popup';
  cartShowNote: boolean;

  /* ── Checkout ───────────────────────────────────────────────────────── */
  checkoutAccentColor: string;
  checkoutButtonText: string;

  /* ── Custom CSS ─────────────────────────────────────────────────────── */
  customCss: string;

  /* ── Logo ────────────────────────────────────────────────────────────── */
  logoUrl: string;
  logoWidth: number;
  faviconUrl: string;
}

export const DEFAULT_THEME: SiteTheme = {
  /* Color Schemes */
  colorSchemes: DEFAULT_COLOR_SCHEMES,

  /* Colors */
  colorPrimary: '#1a1a1a',
  colorSecondary: '#6b8f71',
  colorAccent: '#4338ca',
  colorBg: '#ffffff',
  colorText: '#1a1a1a',
  colorSolidButtonLabel: '#ffffff',

  /* Typography */
  fontHeading: 'Inter',
  fontBody: 'Inter',
  headingScale: 100,
  bodyScale: 100,

  /* Layout */
  pageWidth: 1200,
  spacing: 'normal',
  sectionPadding: 60,

  /* Animations */
  revealOnScroll: true,
  animationStyle: 'fade-up',
  animationDuration: 400,
  hoverEffects: true,

  /* Buttons */
  borderRadius: 'sharp',
  buttonShadow: 'none',
  buttonPadding: 'medium',

  /* Variant pills */
  variantStyle: 'pill',

  /* Inputs */
  inputBorderRadius: 8,
  inputBorderColor: '#d1d5db',

  /* Product cards */
  productCardStyle: 'standard',
  productImageRatio: 'adapt',
  productTextAlign: 'left',
  productShowSecondaryImage: false,
  productShowVendor: true,

  /* Collection cards */
  collectionCardStyle: 'standard',
  collectionImageRatio: 'adapt',

  /* Blog cards */
  blogCardStyle: 'standard',
  blogShowDate: true,
  blogShowAuthor: true,

  /* Content containers */
  containerBorderRadius: 8,
  containerShadow: 'none',

  /* Media */
  mediaBorderRadius: 0,
  mediaShadow: 'none',

  /* Dropdowns & pop-ups */
  dropdownBorderRadius: 8,
  dropdownShadow: 'medium',

  /* Drawers */
  drawerBorderRadius: 12,

  /* Badges */
  badgePosition: 'top-left',
  badgeShape: 'rectangle',
  saleBadgeColor: '#ef4444',

  /* Brand information */
  brandName: '',
  brandDescription: '',

  /* Social media */
  socialInstagram: '',
  socialTwitter: '',
  socialTiktok: '',
  socialFacebook: '',
  socialYoutube: '',
  socialSnapchat: '',

  /* Search behavior */
  searchEnabled: true,
  searchShowSuggestions: true,

  /* Currency format */
  currency: 'SAR',
  currencyPosition: 'prefix',

  /* Cart */
  cartType: 'drawer',
  cartShowNote: false,

  /* Checkout */
  checkoutAccentColor: '#1a1a1a',
  checkoutButtonText: 'Complete order',

  /* Custom CSS */
  customCss: '',

  /* Logo */
  logoUrl: '',
  logoWidth: 120,
  faviconUrl: '',
};

/* Maps for CSS var generation */
export const RADIUS_MAP: Record<SiteTheme['borderRadius'], string> = {
  sharp: '0px',
  rounded: '8px',
  pill: '9999px',
};

export const SPACING_MAP: Record<SiteTheme['spacing'], string> = {
  compact: '0.75rem',
  normal: '1rem',
  spacious: '1.5rem',
};

export const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Poppins',
  'Montserrat',
  'Nunito',
  'Roboto',
  'Open Sans',
  'Lato',
  'Raleway',
  'Oswald',
  'Merriweather',
  'PT Serif',
  'Source Sans 3',
  'DM Sans',
  'Space Grotesk',
  'Outfit',
  'Sora',
  'Cormorant Garamond',
  'Libre Baskerville',
  'Crimson Text',
] as const;

export const CURRENCY_OPTIONS = [
  { code: 'SAR', label: 'SAR - Saudi Riyal' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'AED', label: 'AED - UAE Dirham' },
  { code: 'KWD', label: 'KWD - Kuwaiti Dinar' },
  { code: 'QAR', label: 'QAR - Qatari Riyal' },
  { code: 'BHD', label: 'BHD - Bahraini Dinar' },
  { code: 'OMR', label: 'OMR - Omani Rial' },
  { code: 'EGP', label: 'EGP - Egyptian Pound' },
  { code: 'TRY', label: 'TRY - Turkish Lira' },
] as const;

/* Generates the <style> tag content for CSS custom properties */
export function buildThemeCssVars(theme: SiteTheme): string {
  const btnRadiusMap: Record<string, string> = { sharp: '0px', rounded: '8px', pill: '9999px' };
  const btnShadowMap: Record<string, string> = { none: 'none', small: '0 1px 2px rgba(0,0,0,.08)', medium: '0 2px 8px rgba(0,0,0,.12)', large: '0 4px 16px rgba(0,0,0,.16)' };
  const btnPadMap: Record<string, string> = { small: '0.5rem 1rem', medium: '0.75rem 1.5rem', large: '1rem 2rem' };

  // Generate per-scheme CSS variables
  const schemeCss = (theme.colorSchemes ?? DEFAULT_COLOR_SCHEMES).map((s) => `
  .color-${s.id} {
    --scheme-bg: ${s.background};
    --scheme-bg-gradient: ${s.backgroundGradient || s.background};
    --scheme-text: ${s.text};
    --scheme-btn-bg: ${s.solidButtonBg};
    --scheme-btn-label: ${s.solidButtonLabel};
    --scheme-outline-btn: ${s.outlineButton};
    --scheme-shadow: ${s.shadow};
  }`).join('\n');

  return `
:root {
  --c-primary:    ${theme.colorPrimary};
  --c-secondary:  ${theme.colorSecondary};
  --c-accent:     ${theme.colorAccent};
  --c-bg:         ${theme.colorBg};
  --c-text:       ${theme.colorText};
  --c-btn-label:  ${theme.colorSolidButtonLabel};
  --font-heading: '${theme.fontHeading}', system-ui, sans-serif;
  --font-body:    '${theme.fontBody}', system-ui, sans-serif;
  --heading-scale: ${theme.headingScale / 100};
  --body-scale:    ${theme.bodyScale / 100};
  --radius:       ${RADIUS_MAP[theme.borderRadius]};
  --spacing-unit: ${SPACING_MAP[theme.spacing]};
  --page-width:   ${theme.pageWidth}px;
  --section-padding: ${theme.sectionPadding}px;
  --btn-radius:   ${btnRadiusMap[theme.borderRadius] ?? '0px'};
  --btn-shadow:   ${btnShadowMap[theme.buttonShadow] ?? 'none'};
  --btn-padding:  ${btnPadMap[theme.buttonPadding] ?? '0.75rem 1.5rem'};
  --input-radius: ${theme.inputBorderRadius}px;
  --input-border: ${theme.inputBorderColor};
  --container-radius: ${theme.containerBorderRadius}px;
  --media-radius: ${theme.mediaBorderRadius}px;
  --dropdown-radius: ${theme.dropdownBorderRadius}px;
  --drawer-radius: ${theme.drawerBorderRadius}px;
  --badge-color:  ${theme.saleBadgeColor};
  --checkout-accent: ${theme.checkoutAccentColor};
  --animation-duration: ${theme.animationDuration}ms;
}
${schemeCss}`.trim();
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
