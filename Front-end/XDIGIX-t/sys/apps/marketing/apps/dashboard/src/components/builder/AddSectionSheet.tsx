import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';

interface Props {
  open: boolean;
  onClose: () => void;
  onAddSection: (type: SectionType) => void;
}

const TABS = ['All', 'Layout', 'Content', 'E-commerce', 'Engagement', 'Social Proof'] as const;
type Tab = typeof TABS[number];

export default function AddSectionSheet({ open, onClose, onAddSection }: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('All');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const entries = Object.values(SECTION_REGISTRY);
  const filtered = entries.filter((entry) => {
    const matchesTab = activeTab === 'All' || entry.category === activeTab;
    const matchesSearch = !search || entry.label.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-[360px] bg-white border-r border-[#e5e7eb] flex flex-col shadow-2xl"
        style={{ animation: 'slideInLeft 0.2s ease' }}
      >
        <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div className="p-4 border-b border-[#e5e7eb] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#111827]">Add section</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#111827] flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search sections…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#e5e7eb] rounded-lg text-[#111827] text-xs pl-8 pr-3 py-2 outline-none focus:border-[#27491F] placeholder-[#9ca3af]"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex px-4 pt-2 border-b border-[#e5e7eb] flex-shrink-0 overflow-x-auto gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[11px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'text-[#27491F] border-[#27491F]'
                  : 'text-[#6b7280] border-transparent hover:text-[#111827]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-[#9ca3af] text-xs text-center mt-8">No sections found</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((entry) => (
                <button
                  key={entry.type}
                  onClick={() => { onAddSection(entry.type as SectionType); onClose(); }}
                  className="rounded-lg overflow-hidden border border-[#e5e7eb] hover:border-[#27491F] hover:shadow-[0_0_0_2px_rgba(39,73,31,0.2)] transition-all text-left group"
                >
                  {/* Mini preview */}
                  <div className="h-[72px] bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] flex items-center justify-center text-[#9ca3af] group-hover:text-[#6b7280] transition-colors">
                    <span className="material-icons text-2xl">{entry.icon}</span>
                  </div>
                  <div className="px-2 py-1.5 bg-white flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#111827] truncate">{entry.label}</span>
                    <span className="text-[10px] text-[#9ca3af] ml-auto whitespace-nowrap">{entry.category}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
