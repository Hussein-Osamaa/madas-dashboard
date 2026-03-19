import { useState, useCallback } from 'react';
import { Sun, Plus, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Section, SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';
import { useBuilderNav } from './hooks/useBuilderNav';
import SectionEditor from './SectionEditor';

// ── Props ──────────────────────────────────────────────────────────────────

interface PanelProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSection: (id: string, data: Record<string, unknown>) => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onReorderSection: (id: string, direction: 'up' | 'down') => void;
  onOpenAddSheet: () => void;
  onOpenTheme: () => void;
  businessId: string;
  siteId?: string;
}

interface BuilderLeftPanelProps extends PanelProps {
  isDrawer?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

// ── Inner panel content (shared between desktop and drawer) ────────────────

function PanelContent({
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onReorderSection,
  onOpenAddSheet,
  onOpenTheme,
  businessId,
  siteId,
}: PanelProps) {
  const nav = useBuilderNav();
  const [ssTab, setSsTab] = useState<'content' | 'style'>('content');

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  const handleSelectSection = useCallback((section: Section) => {
    const entry = SECTION_REGISTRY[section.type as SectionType];
    nav.pushSection(section.id, entry?.label ?? section.type);
    onSelectSection(section.id);
    setSsTab('content');
  }, [nav.pushSection, onSelectSection]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    nav.goTo(index);
    if (index === 0) onSelectSection(null);
  }, [nav.goTo, onSelectSection]);

  const viewTitle = nav.current.view === 'outline' ? 'Page outline'
    : nav.current.view === 'section' ? 'Section settings'
    : 'Block settings';

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] overflow-hidden">
      {/* Panel title row */}
      <div className="px-3.5 pt-3 pb-0 flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-semibold text-[#999] uppercase tracking-[.6px] flex-1">
          {viewTitle}
        </span>
        <button
          onClick={onOpenTheme}
          title="Theme settings"
          className="w-6 h-6 rounded flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#2a2a2a] transition-colors"
        >
          <Sun size={13} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3.5 pt-2.5 pb-2 border-b border-[#2a2a2a] flex-shrink-0 min-h-[36px] overflow-hidden">
        {nav.stack.map((frame, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={10} className="text-[#444] flex-shrink-0" />}
            <button
              onClick={() => handleBreadcrumbClick(i)}
              className={clsx(
                'text-[11px] truncate transition-colors max-w-[100px]',
                i === nav.stack.length - 1
                  ? 'text-[#e8e8e8] font-medium cursor-default'
                  : 'text-[#666] hover:text-[#ccc] cursor-pointer'
              )}
            >
              {i === 0 ? 'Home page' : frame.label}
            </button>
          </span>
        ))}
      </div>

      {/* ── OUTLINE VIEW ── */}
      {nav.current.view === 'outline' && (
        <div className="flex-1 overflow-y-auto py-2">
          {sections.map((section, idx) => {
            const entry = SECTION_REGISTRY[section.type as SectionType];
            const isSelected = selectedSectionId === section.id;
            return (
              <div
                key={section.id}
                className="group cursor-pointer"
                onClick={() => handleSelectSection(section)}
              >
                <div className={clsx(
                  'flex items-center gap-2.5 px-3.5 py-2 transition-colors',
                  'hover:bg-[#242424]',
                  isSelected && 'bg-[#27491F22] border-l-2 border-[#27491F] pl-[calc(0.875rem-2px)]'
                )}>
                  {/* Section icon — Material Icons glyph */}
                  <div className="w-7 h-7 rounded-md bg-[#252525] flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-sm text-[#888]">{entry?.icon ?? 'web'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#d0d0d0] truncate">{entry?.label ?? section.type}</div>
                    <div className="text-[10px] text-[#555] uppercase tracking-[.4px]">{entry?.category ?? 'section'}</div>
                  </div>
                  {/* Hover actions */}
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onReorderSection(section.id, 'up'); }}
                      disabled={idx === 0}
                      title="Move up"
                      className="w-5 h-5 rounded text-[10px] flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#333] disabled:opacity-30 transition-colors"
                    >↑</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReorderSection(section.id, 'down'); }}
                      disabled={idx === sections.length - 1}
                      title="Move down"
                      className="w-5 h-5 rounded text-[10px] flex items-center justify-center text-[#666] hover:text-[#ccc] hover:bg-[#333] disabled:opacity-30 transition-colors"
                    >↓</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
                      title="Delete section"
                      className="w-5 h-5 rounded text-[11px] flex items-center justify-center text-[#666] hover:text-red-400 hover:bg-[#333] transition-colors"
                    >×</button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Add section */}
          <button
            onClick={onOpenAddSheet}
            className="mx-3.5 mt-1.5 mb-3 flex items-center gap-2 w-[calc(100%-28px)] px-3 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-[#666] text-xs hover:border-[#444] hover:text-[#999] hover:bg-[#1f1f1f] transition-all"
          >
            <Plus size={13} />
            Add section
          </button>
        </div>
      )}

      {/* ── SECTION SETTINGS VIEW ── */}
      {nav.current.view === 'section' && selectedSection && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section badge */}
          <div className="px-3.5 pt-3 pb-0 flex-shrink-0">
            {(() => {
              const entry = SECTION_REGISTRY[selectedSection.type as SectionType];
              return (
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#222] rounded-lg mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#27491F33] flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-base text-[#6dbf67]">{entry?.icon ?? 'web'}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#e8e8e8]">{entry?.label ?? selectedSection.type}</div>
                    <div className="text-[10px] text-[#666] uppercase tracking-[.5px]">{entry?.category ?? 'section'}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Content / Style tabs */}
          <div className="flex border-b border-[#2a2a2a] flex-shrink-0 px-3.5">
            {(['content', 'style'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSsTab(tab)}
                className={clsx(
                  'flex-1 py-2.5 text-center text-xs font-medium capitalize border-b-2 -mb-px transition-all',
                  ssTab === tab
                    ? 'text-[#e8e8e8] border-[#27491F]'
                    : 'text-[#666] border-transparent hover:text-[#ccc]'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* SectionEditor rendered in embedded mode */}
          <div className="flex-1 overflow-y-auto">
            <SectionEditor
              key={selectedSection.id}
              section={selectedSection}
              onUpdate={(data) => onUpdateSection(selectedSection.id, data)}
              onClose={() => { nav.goTo(0); onSelectSection(null); }}
              businessId={businessId}
              siteId={siteId}
              embedded={true}
              activeTabOverride={ssTab === 'content' ? 'content' : 'style'}
            />
          </div>
        </div>
      )}

      {/* ── BLOCK SETTINGS VIEW ── */}
      {nav.current.view === 'block' && (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <p className="text-xs text-[#666] text-center mt-8">
            Block-level editing coming soon.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────

export default function BuilderLeftPanel({
  isDrawer,
  drawerOpen,
  onDrawerClose,
  ...panelProps
}: BuilderLeftPanelProps) {
  // Desktop mode: fixed 280px left panel
  if (!isDrawer) {
    return (
      <div className="w-[280px] border-r border-[#2a2a2a] flex-shrink-0 h-full overflow-hidden">
        <PanelContent {...panelProps} />
      </div>
    );
  }

  // Mobile drawer mode: overlay
  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onDrawerClose}
        />
      )}
      <div
        className={clsx(
          'fixed left-0 top-12 bottom-0 w-[280px] z-50 md:hidden transition-transform duration-200 shadow-2xl',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <PanelContent {...panelProps} />
      </div>
    </>
  );
}
