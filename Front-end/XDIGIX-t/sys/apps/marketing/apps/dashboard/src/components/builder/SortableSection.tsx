import { memo, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Section } from '../../types/builder';

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
      <div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-[#27491F]/30 pointer-events-none transition-all z-[5] rounded-[2px]" />

      {/* Section chip label — top left, shows on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 bg-[#27491F] text-white text-[10px] font-semibold px-2 py-0.5 rounded-br-md opacity-0 group-hover:opacity-100 transition-opacity z-[15] uppercase tracking-[.4px] select-none cursor-grab active:cursor-grabbing flex items-center gap-1"
      >
        <span className="material-icons text-[10px]">drag_indicator</span>
        {section.type}
      </div>

      {/* Action bar — top right, shows on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[15]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSettingsClick?.(); }}
          className="w-7 h-7 rounded-md bg-[#1a1a1a]/90 text-[#ccc] hover:bg-[#27491F] hover:text-white flex items-center justify-center shadow-md transition-colors backdrop-blur-sm"
          title="Section settings"
        >
          <span className="material-icons text-sm">settings</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="w-7 h-7 rounded-md bg-[#1a1a1a]/90 text-[#ccc] hover:bg-[#27491F] hover:text-white flex items-center justify-center shadow-md transition-colors backdrop-blur-sm"
          title="Duplicate"
        >
          <span className="material-icons text-sm">content_copy</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-md bg-[#1a1a1a]/90 text-red-400 hover:bg-red-800 hover:text-white flex items-center justify-center shadow-md transition-colors backdrop-blur-sm"
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
