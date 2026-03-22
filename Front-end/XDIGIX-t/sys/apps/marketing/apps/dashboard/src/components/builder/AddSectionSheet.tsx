import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { X, Search } from 'lucide-react';
import { SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';
import { getDefaultData } from '../../registry/sectionRegistry';
import { SECTION_RENDERERS } from '../../registry/sectionRenderers';
import { mergeSectionData } from './sections/sectionDefaults';

interface Props {
  open: boolean;
  onClose: () => void;
  onAddSection: (type: SectionType) => void;
}

const TABS = ['Sections', 'Apps'] as const;
type Tab = typeof TABS[number];

/* ── Tiny live preview of a section rendered with its default data ──── */
const SectionPreview = memo(({ type }: { type: SectionType }) => {
  const Renderer = SECTION_RENDERERS[type];
  if (!Renderer) return null;

  const defaultData = getDefaultData(type) ?? {};
  const resolvedData = mergeSectionData(type, defaultData) as Record<string, unknown>;

  return (
    <div className="pointer-events-none select-none overflow-hidden bg-white rounded-lg shadow-2xl border border-[#e5e7eb]">
      {/* Scale the section down to fit the preview card */}
      <div
        className="origin-top-left"
        style={{ width: 800, transform: 'scale(0.55)', transformOrigin: 'top left' }}
      >
        <Renderer data={resolvedData} style={{}} />
      </div>
    </div>
  );
});
SectionPreview.displayName = 'SectionPreview';

export default function AddSectionSheet({ open, onClose, onAddSection }: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Sections');
  const [hoveredType, setHoveredType] = useState<SectionType | null>(null);
  const [previewPos, setPreviewPos] = useState<{ top: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('Sections');
      setHoveredType(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Page-specific sections that shouldn't appear in the "Add Section" sheet
  const PAGE_ONLY_SECTIONS: Set<string> = new Set(['productInfo', 'cart']);

  const entries = useMemo(() => {
    const all = Object.values(SECTION_REGISTRY).filter(e => !PAGE_ONLY_SECTIONS.has(e.type));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((e) => e.label.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q));
  }, [search]);

  // Group by category for the Sections tab
  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const cat = entry.category || 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(entry);
    }
    return map;
  }, [entries]);

  const handleHover = useCallback((type: SectionType, rowEl: HTMLElement | null) => {
    setHoveredType(type);
    if (rowEl) {
      const rowRect = rowEl.getBoundingClientRect();
      // Use fixed viewport coordinates — clamp so preview stays within viewport
      const previewHeight = 380;
      const viewportH = window.innerHeight;
      const idealTop = rowRect.top - 20;
      const clampedTop = Math.max(16, Math.min(idealTop, viewportH - previewHeight - 16));
      setPreviewPos({ top: clampedTop });
    }
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredType(null);
    setPreviewPos(null);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-[320px] bg-white border-r border-[#e5e7eb] flex flex-col shadow-2xl"
        style={{ animation: 'slideInLeft 0.2s ease' }}
        onMouseLeave={handleLeave}
      >
        <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

        {/* Header — search */}
        <div className="p-3 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-6 h-6 rounded hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#111827] flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="relative mb-2.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search sections"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d5db] rounded-lg text-[#111827] text-xs pl-9 pr-3 py-2 outline-none focus:border-[#27491F] focus:ring-1 focus:ring-[#27491F]/20 placeholder-[#9ca3af]"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-3 border-b border-[#e5e7eb] flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'text-[#111827] border-[#111827]'
                  : 'text-[#6b7280] border-transparent hover:text-[#111827]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Section list */}
        <div ref={listRef} className="flex-1 overflow-y-auto relative">
          {activeTab === 'Apps' ? (
            <div className="p-6 text-center">
              <span className="material-icons text-[#d1d5db] text-3xl mb-2 block">extension</span>
              <p className="text-xs text-[#9ca3af]">No apps installed yet</p>
            </div>
          ) : entries.length === 0 ? (
            <p className="text-[#9ca3af] text-xs text-center mt-8">No sections found</p>
          ) : (
            <div className="py-1">
              {/* If searching, show flat list; otherwise group by category */}
              {search ? (
                entries.map((entry) => (
                  <SectionRow
                    key={entry.type}
                    entry={entry}
                    isHovered={hoveredType === entry.type}
                    onHover={handleHover}
                    onClick={() => { onAddSection(entry.type as SectionType); onClose(); }}
                  />
                ))
              ) : (
                Array.from(grouped.entries()).map(([category, items]) => (
                  <div key={category}>
                    {/* We don't show category headers to keep it clean like Shopify */}
                    {items.map((entry) => (
                      <SectionRow
                        key={entry.type}
                        entry={entry}
                        isHovered={hoveredType === entry.type}
                        onHover={handleHover}
                        onClick={() => { onAddSection(entry.type as SectionType); onClose(); }}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating preview — appears to the right of the panel on hover */}
      {hoveredType && previewPos && (
        <div
          className="fixed z-20 pointer-events-none"
          style={{
            left: 330,
            top: previewPos.top,
            width: 440,
            maxHeight: 420,
            overflow: 'hidden',
          }}
        >
          <div
            className="bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[#e5e7eb] overflow-hidden"
            style={{ animation: 'previewFadeIn 0.15s ease' }}
          >
            <style>{`@keyframes previewFadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }`}</style>
            {/* Section type label */}
            <div className="px-3 py-2 border-b border-[#f3f4f6] bg-[#fafafa]">
              <span className="text-[11px] font-semibold text-[#374151]">
                {SECTION_REGISTRY[hoveredType]?.label}
              </span>
            </div>
            <SectionPreview type={hoveredType} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Single section row ────────────────────────────────────────────── */
interface SectionRowProps {
  entry: (typeof SECTION_REGISTRY)[keyof typeof SECTION_REGISTRY];
  isHovered: boolean;
  onHover: (type: SectionType, el: HTMLElement | null) => void;
  onClick: () => void;
}

const SectionRow = memo(({ entry, isHovered, onHover, onClick }: SectionRowProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(entry.type as SectionType, ref.current)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isHovered
          ? 'bg-[#f0f4ef]'
          : 'hover:bg-[#f9fafb]'
      }`}
    >
      <span
        className={`material-icons text-lg transition-colors ${
          isHovered ? 'text-[#27491F]' : 'text-[#6b7280]'
        }`}
      >
        {entry.icon}
      </span>
      <span className={`text-[13px] font-medium transition-colors ${
        isHovered ? 'text-[#27491F]' : 'text-[#374151]'
      }`}>
        {entry.label}
      </span>
    </button>
  );
});
SectionRow.displayName = 'SectionRow';
