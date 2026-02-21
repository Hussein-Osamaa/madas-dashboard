import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';
import { Section } from '../../types/builder';

type Props = {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  children: ReactNode;
};

const SortableSection = ({ section, isSelected, onSelect, onDelete, onDuplicate, children }: Props) => {
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
      className={`relative group ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {/* Section Controls */}
      <div
        className={`absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
          isSelected ? 'opacity-100' : ''
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-base transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <span className="material-icons text-sm text-madas-text/70">drag_handle</span>
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-base transition-colors"
          title="Duplicate section"
        >
          <span className="material-icons text-sm text-madas-text/70">content_copy</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 bg-white rounded-lg shadow-md border border-red-200 hover:bg-red-50 transition-colors"
          title="Delete section"
        >
          <span className="material-icons text-sm text-red-600">delete</span>
        </button>
      </div>

      {/* Section Label */}
      <div
        className={`absolute top-2 left-2 z-10 px-2 py-1 bg-primary text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity ${
          isSelected ? 'opacity-100' : ''
        }`}
      >
        {section.type.charAt(0).toUpperCase() + section.type.slice(1)} Section
      </div>

      {/* Section Content */}
      <div onClick={onSelect} className="cursor-pointer">
        {children}
      </div>
    </div>
  );
};

export default SortableSection;

