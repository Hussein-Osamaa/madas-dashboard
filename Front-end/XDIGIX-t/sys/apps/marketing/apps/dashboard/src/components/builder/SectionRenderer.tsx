import { Section, SectionType } from '../../types/builder';
import { mergeSectionData } from './sections/sectionDefaults';
import { SECTION_RENDERERS } from '../../registry/sectionRenderers';
import { useTheme, DEFAULT_COLOR_SCHEMES, ColorScheme } from '../../contexts/ThemeContext';

type Props = {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  previewMode?: 'desktop' | 'tablet' | 'mobile';
  siteId?: string;
  onEditBlock?: (dataKey: string, blockIndex: number) => void;
  onDeleteBlock?: (dataKey: string, blockIndex: number) => void;
};

const SectionRenderer = ({ section, isSelected, onSelect, siteId, previewMode, onEditBlock, onDeleteBlock }: Props) => {
  const { theme } = useTheme();

  /**
   * BULLETPROOF DATA RESOLUTION
   * ────────────────────────────
   * Priority order (highest → lowest):
   *  1. section.data   (new format saved by React builder)
   *  2. section.content (legacy format from old HTML builder)
   *  3. SECTION_DEFAULTS[section.type] (canonical defaults)
   *
   * `mergeSectionData` always returns a plain object — never undefined/null —
   * which eliminates the entire family of "Cannot read properties of undefined"
   * crashes across every section component.
   */
  const rawData: unknown =
    (section.data && typeof section.data === 'object' && Object.keys(section.data).length > 0)
      ? section.data
      : ((section as unknown as Record<string, unknown>).content ?? {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedData = mergeSectionData(section.type as any, rawData) as Record<string, any>;

  // ── Resolve color scheme ──────────────────────────────────────────────
  const schemeId = resolvedData.color_scheme as string | undefined;
  const schemes = theme.colorSchemes ?? DEFAULT_COLOR_SCHEMES;
  const activeScheme: ColorScheme | undefined = schemeId
    ? schemes.find(s => s.id === schemeId)
    : undefined;

  const style = section.style || {};
  const padding = style.padding || {};
  const margin  = style.margin  || {};

  // Build margin values based on alignment
  let marginLeft  = margin.left  !== undefined ? `${margin.left}px`  : undefined;
  let marginRight = margin.right !== undefined ? `${margin.right}px` : undefined;

  if (style.maxWidth && style.align === 'center') {
    marginLeft  = 'auto';
    marginRight = 'auto';
  } else if (style.maxWidth && style.align === 'right') {
    marginLeft  = 'auto';
    marginRight = margin.right !== undefined ? `${margin.right}px` : '0';
  }

  // Get animation class
  const getAnimationClass = () => {
    const animation = style.animation || 'none';
    if (animation === 'none') return '';
    return `animate-${animation}`;
  };

  // Build background style from the style panel (manual overrides)
  const backgroundStyle: React.CSSProperties = {};
  if (style.backgroundImage) {
    backgroundStyle.backgroundImage    = `url(${style.backgroundImage})`;
    backgroundStyle.backgroundSize     = 'cover';
    backgroundStyle.backgroundPosition = 'center';
    backgroundStyle.backgroundRepeat   = 'no-repeat';
    if (style.backgroundColor) {
      backgroundStyle.position = 'relative';
    }
  } else if (style.backgroundColor) {
    backgroundStyle.backgroundColor = style.backgroundColor;
  }

  // ── Apply color scheme ──────────────────────────────────────────────
  // Sections that skip scheme background (hero has its own image, divider is transparent)
  const skipSchemeBg = ['hero', 'divider', 'slideshow'].includes(section.type);

  // Scheme background — applied BEFORE style-panel overrides so manual bg wins
  const schemeBgStyle: React.CSSProperties = {};
  if (activeScheme && !skipSchemeBg && !style.backgroundColor && !style.backgroundImage) {
    schemeBgStyle.backgroundColor = activeScheme.background;
    if (activeScheme.backgroundGradient) {
      schemeBgStyle.background = activeScheme.backgroundGradient;
    }
  }

  // Scheme text color
  const schemeTextColor = activeScheme ? activeScheme.text : undefined;

  // CSS custom properties for child components (buttons, etc.)
  const cssVars: Record<string, string> = {};
  if (activeScheme) {
    cssVars['--scheme-bg'] = activeScheme.background;
    cssVars['--scheme-text'] = activeScheme.text;
    cssVars['--scheme-btn-bg'] = activeScheme.solidButtonBg;
    cssVars['--scheme-btn-label'] = activeScheme.solidButtonLabel;
    cssVars['--scheme-outline-btn'] = activeScheme.outlineButton;
    cssVars['--scheme-shadow'] = activeScheme.shadow;
  }
  // Always expose theme button radius
  const btnRadius = theme.borderRadius === 'sharp' ? '0px' : theme.borderRadius === 'pill' ? '9999px' : '8px';
  cssVars['--btn-radius'] = btnRadius;

  // ── Build the final style for the section element ─────────────────
  // Priority: scheme bg → style-panel bg → scheme text → style-panel text
  // IMPORTANT: We filter out undefined values so that when components spread
  // `...style` after their own data-level properties (e.g. padding), the
  // undefined entries don't overwrite the component's values.
  const rawSectionStyle: Record<string, string | undefined> = {
    // Scheme background (lowest priority — overridden by style-panel)
    ...schemeBgStyle,
    // Style-panel padding
    paddingTop:    padding.top    !== undefined ? `${padding.top}px`    : undefined,
    paddingBottom: padding.bottom !== undefined ? `${padding.bottom}px` : undefined,
    paddingLeft:   padding.left   !== undefined ? `${padding.left}px`   : undefined,
    paddingRight:  padding.right  !== undefined ? `${padding.right}px`  : undefined,
    // Style-panel margin
    marginTop:     margin.top     !== undefined ? `${margin.top}px`     : undefined,
    marginBottom:  margin.bottom  !== undefined ? `${margin.bottom}px`  : undefined,
    marginLeft,
    marginRight,
    // Style-panel background (overrides scheme bg)
    ...backgroundStyle,
    // Text color: scheme first, style-panel override wins
    color:        style.textColor || schemeTextColor || undefined,
    borderRadius: style.borderRadius !== undefined ? `${style.borderRadius}px` : undefined,
    boxShadow:    style.shadow
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      : undefined,
    maxWidth: style.maxWidth !== undefined ? `${style.maxWidth}px` : undefined,
    width:    style.maxWidth !== undefined ? '100%'                : undefined,
  };

  // Strip undefined keys so they don't clobber component-level defaults when spread
  const sectionStyle = Object.fromEntries(
    Object.entries(rawSectionStyle).filter(([, v]) => v !== undefined)
  ) as React.CSSProperties;

  const Renderer = SECTION_RENDERERS[section.type as SectionType];
  if (!Renderer) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Unknown section type: {section.type}
      </div>
    );
  }

  // Outer wrapper style: CSS variables + scheme bg + text color (for inherit)
  const wrapperStyle: React.CSSProperties = {
    ...schemeBgStyle,
    color: schemeTextColor,
    ...cssVars as React.CSSProperties,
  };

  return (
    <div
      className={`relative ${isSelected ? 'outline-2 outline-primary outline-offset-2' : ''} ${getAnimationClass()}`}
      onClick={onSelect}
      style={wrapperStyle}
    >
      {style.backgroundImage && style.backgroundColor && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundColor: style.backgroundColor,
            opacity: 0.4,
            borderRadius: style.borderRadius !== undefined ? `${style.borderRadius}px` : undefined,
          }}
        />
      )}
      <Renderer data={resolvedData} style={sectionStyle} siteId={siteId} previewMode={previewMode} isSelected={isSelected} onEditBlock={onEditBlock} onDeleteBlock={onDeleteBlock} />
    </div>
  );
};

export default SectionRenderer;
