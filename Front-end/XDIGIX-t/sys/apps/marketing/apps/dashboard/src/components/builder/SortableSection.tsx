import { memo, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Section } from '../../types/builder';
import type { SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';

type Props = {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSettingsClick?: () => void;
  children: ReactNode;
};

const SortableSection = ({ section, isSelected, onSelect, onDelete, onDuplicate, onSettingsClick, children }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Hover ring overlay */}
      <div className={`absolute inset-0 border-2 pointer-events-none transition-all z-[10] rounded-[2px] ${isSelected ? 'border-[#27491F]' : 'border-transparent group-hover:border-[#27491F]'}`} />

      {/* Section chip label — top left, shows on hover */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute top-0 left-0 bg-[#27491F] text-white text-[10px] font-semibold px-2 py-0.5 rounded-br transition-opacity z-[20] select-none cursor-grab active:cursor-grabbing whitespace-nowrap ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        {SECTION_REGISTRY[section.type as SectionType]?.label ?? section.type}
      </div>

      {/* Action bar — top right, shows on hover */}
      <div className={`absolute top-1.5 right-1.5 flex gap-1 transition-opacity z-[20] ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSettingsClick?.(); }}
          className="w-7 h-7 rounded bg-white/90 backdrop-blur text-[#6b7280] hover:text-[#111827] hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)] flex items-center justify-center transition-colors"
          title="Section settings"
        >
          <span className="material-icons text-sm">settings</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="w-7 h-7 rounded bg-white/90 backdrop-blur text-[#6b7280] hover:text-[#111827] hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)] flex items-center justify-center transition-colors"
          title="Duplicate"
        >
          <span className="material-icons text-sm">content_copy</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded bg-white/90 backdrop-blur text-[#6b7280] hover:text-red-500 hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)] flex items-center justify-center transition-colors"
          title="Delete"
        >
          <span className="material-icons text-sm">delete</span>
        </button>
      </div>

      {/* Section Content */}
      <div onClick={onSelect} className="cursor-pointer">
        {children}
      </div>
    </div>
  );
};

// Re-render only when section data, selection state, or handlers change
export default memo(SortableSection, (prev, next) =>
  prev.section === next.section &&
  prev.isSelected === next.isSelected &&
  prev.onSelect === next.onSelect &&
  prev.onDelete === next.onDelete &&
  prev.onDuplicate === next.onDuplicate &&
  prev.onSettingsClick === next.onSettingsClick &&
  prev.children === next.children
);
