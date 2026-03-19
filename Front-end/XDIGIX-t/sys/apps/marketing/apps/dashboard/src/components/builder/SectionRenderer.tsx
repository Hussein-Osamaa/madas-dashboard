import { Section, SectionType } from '../../types/builder';
import { mergeSectionData } from './sections/sectionDefaults';
import { SECTION_RENDERERS } from '../../registry/sectionRenderers';

type Props = {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  previewMode?: 'desktop' | 'tablet' | 'mobile';
  siteId?: string;
};

const SectionRenderer = ({ section, isSelected, onSelect, siteId, previewMode }: Props) => {
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

  // Build background style
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

  const sectionStyle: React.CSSProperties = {
    paddingTop:    padding.top    !== undefined ? `${padding.top}px`    : undefined,
    paddingBottom: padding.bottom !== undefined ? `${padding.bottom}px` : undefined,
    paddingLeft:   padding.left   !== undefined ? `${padding.left}px`   : undefined,
    paddingRight:  padding.right  !== undefined ? `${padding.right}px`  : undefined,
    marginTop:     margin.top     !== undefined ? `${margin.top}px`     : undefined,
    marginBottom:  margin.bottom  !== undefined ? `${margin.bottom}px`  : undefined,
    marginLeft,
    marginRight,
    ...backgroundStyle,
    color:        style.textColor    || undefined,
    borderRadius: style.borderRadius !== undefined ? `${style.borderRadius}px` : undefined,
    boxShadow:    style.shadow
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      : undefined,
    maxWidth: style.maxWidth !== undefined ? `${style.maxWidth}px` : undefined,
    width:    style.maxWidth !== undefined ? '100%'                : undefined,
  };

  const Renderer = SECTION_RENDERERS[section.type as SectionType];
  if (!Renderer) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Unknown section type: {section.type}
      </div>
    );
  }

  return (
    <div
      className={`relative ${isSelected ? 'outline-2 outline-primary outline-offset-2' : ''} ${getAnimationClass()}`}
      onClick={onSelect}
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
      <Renderer data={resolvedData} style={sectionStyle} siteId={siteId} previewMode={previewMode} />
    </div>
  );
};

export default SectionRenderer;
