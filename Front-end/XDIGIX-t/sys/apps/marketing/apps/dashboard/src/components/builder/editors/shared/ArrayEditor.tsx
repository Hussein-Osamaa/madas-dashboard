import React, { useState, useMemo, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─── Types ────────────────────────────────────────────────────────── */

interface ArrayEditorProps<T extends object> {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, onChange: (updated: T) => void) => React.ReactNode;
  createDefault: () => T;
  maxItems?: number;
  addLabel?: string;
}

/* ─── Sortable Item Wrapper ────────────────────────────────────────── */

interface SortableItemProps {
  id: string;
  index: number;
  total: number;
  isDragOverlay?: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}

function SortableItem({ id, index, total, isDragOverlay, onRemove, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: 'relative' as const,
  };

  // Collapsed state (collapse when NOT drag overlay)
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? { boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: 8 } : style}
      className={`border rounded-lg bg-gray-50 ${
        isDragging ? 'border-[#27491F]/40 ring-2 ring-[#27491F]/20' : 'border-gray-200'
      } ${isDragOverlay ? 'shadow-2xl border-[#27491F]/50 ring-2 ring-[#27491F]/30' : ''}`}
    >
      {/* Header — always visible */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600 touch-none rounded"
          {...attributes}
          {...listeners}
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <span className="material-icons text-base">drag_indicator</span>
        </button>

        {/* Index label */}
        <span className="text-xs font-medium text-gray-500 select-none">#{index + 1}</span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className="material-icons text-sm transition-transform duration-200" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-red-400 hover:text-red-600 rounded"
          aria-label="Remove"
        >
          <span className="material-icons text-sm">delete_outline</span>
        </button>
      </div>

      {/* Content — collapsible */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Main ArrayEditor ─────────────────────────────────────────────── */

function ArrayEditor<T extends object>({
  label, items, onChange, renderItem, createDefault, maxItems = 20, addLabel = 'Add Item',
}: ArrayEditorProps<T>) {
  const dndId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Stable IDs: use a monotonic counter pattern via index + a seed
  const itemIds = useMemo(
    () => items.map((_, i) => `${dndId}-item-${i}`),
    [items.length, dndId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const update = (index: number, updated: T) => {
    const next = [...items];
    next[index] = updated;
    onChange(next);
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => { if (items.length < maxItems) onChange([...items, createDefault()]); };

  const handleDragStart = (event: DragStartEvent) => {
    const idx = itemIds.indexOf(String(event.active.id));
    setActiveIndex(idx >= 0 ? idx : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIndex(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove([...items], oldIndex, newIndex));
  };

  const handleDragCancel = () => setActiveIndex(null);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label} ({items.length})
      </label>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem
                key={itemIds[index]}
                id={itemIds[index]}
                index={index}
                total={items.length}
                onRemove={() => remove(index)}
              >
                {renderItem(item, index, (updated) => update(index, updated))}
              </SortableItem>
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay — shows a ghost of the dragged item */}
        <DragOverlay dropAnimation={null}>
          {activeIndex !== null && items[activeIndex] ? (
            <div className="border border-[#27491F]/40 rounded-lg bg-white/95 shadow-2xl ring-2 ring-[#27491F]/20 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-icons text-base text-gray-400">drag_indicator</span>
                <span className="text-xs font-medium text-gray-500">#{activeIndex + 1}</span>
              </div>
              <div className="opacity-70 pointer-events-none">
                {renderItem(items[activeIndex], activeIndex, () => {})}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {items.length < maxItems && (
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#27491F] border-2 border-dashed border-[#27491F]/30 rounded-lg hover:bg-[#27491F]/5 hover:border-[#27491F]/50 transition-colors"
        >
          <span className="material-icons text-base">add</span>
          {addLabel}
        </button>
      )}
    </div>
  );
}

export default ArrayEditor;
