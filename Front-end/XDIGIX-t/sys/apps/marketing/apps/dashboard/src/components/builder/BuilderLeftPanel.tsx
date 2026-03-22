import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Sun, Plus, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Section, SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';
import type { BlockSchema } from '../../types/engine';
import { useBuilderNav } from './hooks/useBuilderNav';
import SectionEditor from './SectionEditor';
import BlockEditor from './engine/BlockEditor';

// ── Confirm dialog ──────────────────────────────────────────────────────────

const ConfirmDialog = ({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onCancel}>
    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()}>
      <p className="text-sm text-[#374151]">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#6b7280] hover:bg-gray-100 rounded-lg">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
      </div>
    </div>
  </div>
);

// ── Props ──────────────────────────────────────────────────────────────────

export interface BlockEditTarget {
  sectionId: string;
  dataKey: string;
  blockIndex: number;
}

interface PanelProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSection: (id: string, data: Record<string, unknown>) => void;
  onDeleteSection: (id: string) => void;
  onToggleSectionVisibility?: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onReorderSection: (id: string, direction: 'up' | 'down') => void;
  onReorderSections: (sections: Section[]) => void;
  onOpenAddSheet: () => void;
  onOpenTheme: () => void;
  businessId: string;
  siteId?: string;
  editBlockTarget?: BlockEditTarget | null;
  onEditBlockTargetConsumed?: () => void;
}

interface BuilderLeftPanelProps extends PanelProps {
  isDrawer?: boolean;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

// ── Block icon mapping ──────────────────────────────────────────────────────

const BLOCK_ICONS: Record<string, string> = {
  heading: 'title',
  text: 'notes',
  buttons: 'smart_button',
  announcement: 'campaign',
  menu_item: 'link',
  feature: 'star',
  testimonial: 'format_quote',
  faq_item: 'help',
  slide: 'photo',
  // Product Information block types
  title: 'title',
  price: 'sell',
  vendor: 'storefront',
  description: 'subject',
  quantity_selector: 'exposure',
  buy_buttons: 'shopping_cart',
  sku: 'qr_code',
  inventory_status: 'warehouse',
  share: 'share',
  rating: 'star',
  collapsible_tab: 'expand_more',
  custom_text: 'notes',
  variant_picker: 'tune',
  email_signup: 'mail',
};

/** Get a short preview label for a block by reading its most relevant field */
function getBlockPreview(block: Record<string, unknown>): string {
  // For productInfo blocks with no user-configurable fields, show the picker type or empty
  if (block.picker_type) {
    const typeLabel = { dropdown: 'Dropdown', pills: 'Pills', color_swatches: 'Swatches' } as Record<string, string>;
    return typeLabel[block.picker_type as string] ?? '';
  }
  const text = (block.text || block.label || block.heading || block.button_label_1 || block.title || '') as string;
  if (!text) return '';
  return text.length > 28 ? text.slice(0, 28) + '...' : text;
}

// ── Sortable block row (within a section in the outline) ───────────────────

interface SortableBlockRowProps {
  id: string;
  block: Record<string, unknown>;
  blockSchema: BlockSchema;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const SortableBlockRow = memo(({ id, block, blockSchema, index, isSelected, onClick, onDelete }: SortableBlockRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  const icon = BLOCK_ICONS[block.type as string] || blockSchema.icon || 'extension';
  const typeName = blockSchema.singularLabel || blockSchema.label;
  const preview = getBlockPreview(block);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('group cursor-pointer', isDragging && 'shadow-md rounded bg-white')}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className={clsx(
        'flex items-center gap-1.5 pl-10 pr-3 py-[7px] transition-colors',
        'hover:bg-[#f3f4f6]',
        isSelected && 'bg-[#e8f0e6]'
      )}>
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#d1d5db] hover:text-[#6b7280] cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVertical size={12} />
        </button>
        {/* Block icon */}
        <span className="material-icons flex-shrink-0 text-[#9ca3af]" style={{ fontSize: '16px' }}>{icon}</span>
        {/* Block name + preview */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-[#374151] flex-shrink-0">{typeName}</span>
          {preview && (
            <>
              <span className="text-[10px] text-[#d1d5db]">–</span>
              <span className="text-[11px] text-[#9ca3af] italic truncate">{preview}</span>
            </>
          )}
        </div>
        {/* Delete on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#d1d5db] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove block"
        >
          <span className="material-icons" style={{ fontSize: '14px' }}>close</span>
        </button>
      </div>
    </div>
  );
});
SortableBlockRow.displayName = 'SortableBlockRow';

// ── Block overlay ghost ─────────────────────────────────────────────────────

function BlockDragGhost({ block, blockSchema }: { block: Record<string, unknown>; blockSchema: BlockSchema }) {
  const icon = BLOCK_ICONS[block.type as string] || blockSchema.icon || 'extension';
  const typeName = blockSchema.singularLabel || blockSchema.label;
  const preview = getBlockPreview(block);

  return (
    <div className="flex items-center gap-1.5 pl-3 pr-4 py-[7px] bg-white border border-[#27491F]/30 rounded-lg shadow-xl ring-2 ring-[#27491F]/10">
      <GripVertical size={12} className="text-[#9ca3af]" />
      <span className="material-icons text-[#9ca3af]" style={{ fontSize: '16px' }}>{icon}</span>
      <span className="text-[12px] font-medium text-[#374151]">{typeName}</span>
      {preview && (
        <>
          <span className="text-[10px] text-[#d1d5db]">–</span>
          <span className="text-[11px] text-[#9ca3af] italic truncate max-w-[120px]">{preview}</span>
        </>
      )}
    </div>
  );
}

// ── Sortable section row with expandable block tree ─────────────────────────

interface SortableSectionRowProps {
  section: Section;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
  onBlockClick: (blockSchema: BlockSchema, blockIndex: number) => void;
  onBlockDelete: (dataKey: string, blockIndex: number) => void;
  onBlockAdd: (blockSchema: BlockSchema) => void;
  onBlocksReorder: (dataKey: string, oldIndex: number, newIndex: number) => void;
  selectedBlockKey?: string;
  selectedBlockIndex?: number;
}

const SortableSectionRow = memo(({
  section, isSelected, isExpanded, onToggleExpand, onSelect, onDelete, onToggleVisibility,
  onBlockClick, onBlockDelete, onBlockAdd, onBlocksReorder,
  selectedBlockKey, selectedBlockIndex,
}: SortableSectionRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const entry = SECTION_REGISTRY[section.type as SectionType];
  const hasBlocks = entry?.blocks && entry.blocks.length > 0;

  // Collect all blocks from all dataKeys into a flat ordered list
  const blockItems = useMemo(() => {
    if (!hasBlocks || !entry?.blocks) return [];
    // Gather unique dataKeys
    const dataKeys = [...new Set(entry.blocks.map(b => b.dataKey))];
    const items: Array<{ block: Record<string, unknown>; schema: BlockSchema; index: number; dataKey: string }> = [];
    for (const dk of dataKeys) {
      const arr = (section.data[dk] as Record<string, unknown>[]) ?? [];
      arr.forEach((block, i) => {
        // Find matching schema by block.type
        let schema = entry.blocks!.find(bs => bs.type === (block.type as string));
        if (!schema) schema = entry.blocks!.find(bs => bs.dataKey === dk);
        if (schema) items.push({ block, schema, index: i, dataKey: dk });
      });
    }
    return items;
  }, [section.data, hasBlocks, entry?.blocks]);

  // Block DnD
  const blockIds = useMemo(
    () => blockItems.map((_, i) => `block-${section.id}-${i}`),
    [blockItems.length, section.id]
  );
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const handleBlockDragStart = useCallback((e: DragStartEvent) => {
    const idx = blockIds.indexOf(String(e.active.id));
    setActiveDragIdx(idx >= 0 ? idx : null);
  }, [blockIds]);

  const handleBlockDragEnd = useCallback((e: DragEndEvent) => {
    setActiveDragIdx(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blockIds.indexOf(String(active.id));
    const newIdx = blockIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const item = blockItems[oldIdx];
    if (item) onBlocksReorder(item.dataKey, oldIdx, newIdx);
  }, [blockIds, blockItems, onBlocksReorder]);

  // Unique block schemas for the "Add block" dropdown
  const addableSchemas = entry?.blocks ?? [];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(isDragging && 'shadow-lg rounded-lg bg-white')}
    >
      {/* Section row */}
      <div
        className={clsx(
          'group flex items-center gap-2 px-3.5 py-2 transition-colors cursor-pointer',
          'hover:bg-[#f3f4f6]',
          isSelected && !isExpanded && 'bg-[#e8f0e6] border-l-2 border-[#27491F] pl-[calc(0.875rem-2px)]'
        )}
        onClick={onSelect}
      >
        {/* Expand chevron (only if section has blocks) */}
        {hasBlocks ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-[#d1d5db] hover:text-[#6b7280] cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <span className="material-icons" style={{ fontSize: '14px' }}>drag_indicator</span>
        </button>
        {/* Section icon */}
        <div className="w-7 h-7 rounded-md bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
          <span className="material-icons text-sm text-[#6b7280]">{entry?.icon ?? 'web'}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <div className={clsx('text-xs font-medium truncate', section.hidden ? 'text-[#9ca3af]' : 'text-[#111827]')}>{entry?.label ?? section.type}</div>
          {/* Hidden indicator — always visible when section is hidden */}
          {section.hidden && (
            <span className="material-icons text-[#9ca3af] flex-shrink-0" style={{ fontSize: '13px' }}>visibility_off</span>
          )}
        </div>
        {/* Actions on hover */}
        <div className="hidden group-hover:flex items-center gap-0.5">
          {/* Visibility toggle */}
          {onToggleVisibility && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
              title={section.hidden ? 'Show section' : 'Hide section'}
              className="w-5 h-5 rounded flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
            >
              <span className="material-icons" style={{ fontSize: '14px' }}>{section.hidden ? 'visibility' : 'visibility_off'}</span>
            </button>
          )}
          {/* Delete — only for non-locked sections */}
          {!section.locked && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete section"
              className="w-5 h-5 rounded flex items-center justify-center text-[#6b7280] hover:text-red-400 hover:bg-[#f3f4f6] transition-colors"
            >
              <span className="material-icons" style={{ fontSize: '14px' }}>delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded block tree */}
      {isExpanded && hasBlocks && (
        <div className="pb-1">
          {/* Add block button */}
          <AddBlockDropdown schemas={addableSchemas} onAdd={onBlockAdd} existingBlocks={blockItems.map(i => i.block)} />

          {/* Block list with DnD */}
          <DndContext
            sensors={blockSensors}
            collisionDetection={closestCenter}
            onDragStart={handleBlockDragStart}
            onDragEnd={handleBlockDragEnd}
          >
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {blockItems.map((item, idx) => (
                <SortableBlockRow
                  key={blockIds[idx]}
                  id={blockIds[idx]}
                  block={item.block}
                  blockSchema={item.schema}
                  index={item.index}
                  isSelected={selectedBlockKey === item.schema.type && selectedBlockIndex === item.index}
                  onClick={() => onBlockClick(item.schema, item.index)}
                  onDelete={() => onBlockDelete(item.dataKey, item.index)}
                />
              ))}
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeDragIdx !== null && blockItems[activeDragIdx] ? (
                <BlockDragGhost
                  block={blockItems[activeDragIdx].block}
                  blockSchema={blockItems[activeDragIdx].schema}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
});
SortableSectionRow.displayName = 'SortableSectionRow';

// ── Add block dropdown ──────────────────────────────────────────────────────

function AddBlockDropdown({ schemas, onAdd, existingBlocks }: { schemas: BlockSchema[]; onAdd: (s: BlockSchema) => void; existingBlocks: Record<string, unknown>[] }) {
  const [open, setOpen] = useState(false);

  // Filter out block types that have reached their maxItems limit
  const typeCounts = new Map<string, number>();
  existingBlocks.forEach(b => {
    const t = b.type as string;
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  });
  const availableSchemas = schemas.filter(s => {
    const count = typeCounts.get(s.type) ?? 0;
    const max = s.maxItems ?? Infinity;
    return count < max;
  });

  if (availableSchemas.length === 0) return null;

  if (availableSchemas.length === 1) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(availableSchemas[0]); }}
        className="flex items-center gap-1.5 pl-11 pr-3 py-[6px] text-[12px] font-medium text-[#4b7c3f] hover:bg-[#e8f0e6]/60 transition-colors w-full"
      >
        <Plus size={13} />
        Add {availableSchemas[0].singularLabel.toLowerCase()}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 pl-11 pr-3 py-[6px] text-[12px] font-medium text-[#4b7c3f] hover:bg-[#e8f0e6]/60 transition-colors w-full"
      >
        <Plus size={13} />
        Add block
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-8 top-full mt-0.5 z-40 bg-white border border-[#e5e7eb] rounded-lg shadow-xl py-1 min-w-[160px]">
            {availableSchemas.map((s) => (
              <button
                key={s.type}
                onClick={(e) => { e.stopPropagation(); onAdd(s); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#374151] hover:bg-[#f3f4f6] transition-colors"
              >
                <span className="material-icons text-sm text-[#9ca3af]">{BLOCK_ICONS[s.type] || s.icon || 'add'}</span>
                {s.singularLabel}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Inner panel content (shared between desktop and drawer) ────────────────

function PanelContent({
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onToggleSectionVisibility,
  onDuplicateSection,
  onReorderSection,
  onReorderSections,
  onOpenAddSheet,
  onOpenTheme,
  businessId,
  siteId,
  editBlockTarget,
  onEditBlockTargetConsumed,
}: PanelProps) {
  const nav = useBuilderNav();
  const [ssTab, setSsTab] = useState<'content' | 'style'>('content');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Drag-and-drop sensors for section reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderSections(arrayMove(sections, oldIndex, newIndex));
  }, [sections, onReorderSections]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  // Toggle section expand in outline
  const toggleExpand = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  // Auto-navigate to a block when editBlockTarget is set from the canvas
  useEffect(() => {
    if (!editBlockTarget) return;
    const { sectionId, dataKey, blockIndex } = editBlockTarget;
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const entry = SECTION_REGISTRY[section.type as SectionType];
    if (!entry?.blocks?.length) return;

    const sData = section.data as Record<string, any>;
    const arr = sData[dataKey] ?? [];
    const block = arr[blockIndex];

    let blockSchema = entry.blocks.find(bs => bs.dataKey === dataKey);
    if (block?.type) {
      const byType = entry.blocks.find(bs => bs.type === block.type);
      if (byType) blockSchema = byType;
    }

    if (!block || !blockSchema) {
      onSelectSection(sectionId);
      nav.pushSection(sectionId, entry.label ?? section.type);
      setSsTab('content');
      onEditBlockTargetConsumed?.();
      return;
    }

    onSelectSection(sectionId);
    nav.pushSection(sectionId, entry.label ?? section.type);
    nav.pushBlock(blockSchema.type, blockSchema.singularLabel ?? blockSchema.label, blockIndex);
    setSsTab('content');
    onEditBlockTargetConsumed?.();
  }, [editBlockTarget]);

  const handleSelectSection = useCallback((section: Section) => {
    const entry = SECTION_REGISTRY[section.type as SectionType];
    nav.pushSection(section.id, entry?.label ?? section.type);
    onSelectSection(section.id);
    setSsTab('content');
  }, [nav.pushSection, onSelectSection]);

  const handleBlockClick = useCallback((section: Section, blockSchema: BlockSchema, blockIndex: number) => {
    const entry = SECTION_REGISTRY[section.type as SectionType];
    onSelectSection(section.id);
    nav.pushSection(section.id, entry?.label ?? section.type);
    nav.pushBlock(blockSchema.type, blockSchema.singularLabel ?? blockSchema.label, blockIndex);
  }, [nav, onSelectSection]);

  const handleBlockDelete = useCallback((section: Section, dataKey: string, blockIndex: number) => {
    const sData = section.data as Record<string, any>;
    const arr = [...(sData[dataKey] ?? [])];
    arr.splice(blockIndex, 1);
    onUpdateSection(section.id, { ...sData, [dataKey]: arr });
  }, [onUpdateSection]);

  const handleBlockAdd = useCallback((section: Section, blockSchema: BlockSchema) => {
    const sData = section.data as Record<string, any>;
    const arr = [...(sData[blockSchema.dataKey] ?? [])];
    // Enforce maxItems per block type
    const existingCount = arr.filter((b: any) => b.type === blockSchema.type).length;
    const maxItems = blockSchema.maxItems ?? Infinity;
    if (existingCount >= maxItems) return;
    arr.push(blockSchema.createDefault());
    onUpdateSection(section.id, { ...sData, [blockSchema.dataKey]: arr });
  }, [onUpdateSection]);

  const handleBlocksReorder = useCallback((section: Section, dataKey: string, oldIndex: number, newIndex: number) => {
    const sData = section.data as Record<string, any>;
    const arr = [...(sData[dataKey] ?? [])];
    const reordered = arrayMove(arr, oldIndex, newIndex);
    onUpdateSection(section.id, { ...sData, [dataKey]: reordered });
  }, [onUpdateSection]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    nav.goTo(index);
    if (index === 0) onSelectSection(null);
  }, [nav.goTo, onSelectSection]);

  const viewTitle = nav.current.view === 'outline' ? 'Page outline'
    : nav.current.view === 'section' ? 'Section settings'
    : 'Block settings';

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Panel title row */}
      <div className="px-3.5 pt-3 pb-0 flex items-center gap-2 flex-shrink-0">
        {nav.current.view !== 'outline' && (
          <button
            onClick={() => { nav.goTo(nav.stack.length - 2); if (nav.stack.length <= 2) onSelectSection(null); }}
            title="Back"
            className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>arrow_back</span>
          </button>
        )}
        <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[.6px] flex-1">
          {viewTitle}
        </span>
        <button
          onClick={onOpenTheme}
          title="Theme settings"
          className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
        >
          <Sun size={13} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3.5 pt-2.5 pb-2 border-b border-[#e5e7eb] flex-shrink-0 min-h-[36px] overflow-hidden">
        {nav.stack.map((frame, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={10} className="text-[#9ca3af] flex-shrink-0" />}
            <button
              onClick={() => handleBreadcrumbClick(i)}
              className={clsx(
                'text-[11px] truncate transition-colors max-w-[100px]',
                i === nav.stack.length - 1
                  ? 'text-[#111827] font-medium cursor-default'
                  : 'text-[#6b7280] hover:text-[#111827] cursor-pointer'
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SortableSectionRow
                  key={section.id}
                  section={section}
                  isSelected={selectedSectionId === section.id}
                  isExpanded={expandedSections.has(section.id)}
                  onToggleExpand={() => toggleExpand(section.id)}
                  onSelect={() => handleSelectSection(section)}
                  onDelete={() => setConfirmDialog({ message: 'Are you sure you want to delete this section?', onConfirm: () => { onDeleteSection(section.id); setConfirmDialog(null); } })}
                  onToggleVisibility={onToggleSectionVisibility ? () => onToggleSectionVisibility(section.id) : undefined}
                  onBlockClick={(schema, idx) => handleBlockClick(section, schema, idx)}
                  onBlockDelete={(dk, idx) => setConfirmDialog({ message: 'Are you sure you want to delete this block?', onConfirm: () => { handleBlockDelete(section, dk, idx); setConfirmDialog(null); } })}
                  onBlockAdd={(schema) => handleBlockAdd(section, schema)}
                  onBlocksReorder={(dk, oldIdx, newIdx) => handleBlocksReorder(section, dk, oldIdx, newIdx)}
                  selectedBlockKey={nav.current.view === 'block' && selectedSectionId === section.id ? nav.current.blockKey : undefined}
                  selectedBlockIndex={nav.current.view === 'block' && selectedSectionId === section.id ? nav.current.blockIndex : undefined}
                />
              ))}
            </SortableContext>
          </DndContext>
          {/* Add section */}
          <button
            onClick={onOpenAddSheet}
            className="mx-3.5 mt-1.5 mb-3 flex items-center gap-2 w-[calc(100%-28px)] px-3 py-2.5 border border-dashed border-[#e5e7eb] rounded-lg text-[#27491F] text-xs hover:border-[#27491F] hover:text-[#27491F] hover:bg-[#e8f0e6] transition-all"
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
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f9fafb] rounded-lg mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e8f0e6] flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-base text-[#27491F]">{entry?.icon ?? 'web'}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">{entry?.label ?? selectedSection.type}</div>
                    <div className="text-[10px] text-[#6b7280] uppercase tracking-[.5px]">{entry?.category ?? 'section'}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Content / Style tabs */}
          <div className="flex border-b border-[#e5e7eb] flex-shrink-0 px-3.5">
            {(['content', 'style'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSsTab(tab)}
                className={clsx(
                  'flex-1 py-2.5 text-center text-xs font-medium capitalize border-b-2 -mb-px transition-all',
                  ssTab === tab
                    ? 'text-[#27491F] border-[#27491F]'
                    : 'text-[#6b7280] border-transparent hover:text-[#111827]'
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
      {nav.current.view === 'block' && selectedSection && (() => {
        const entry = SECTION_REGISTRY[selectedSection.type as SectionType];
        const blockSchema = entry?.blocks?.find(b => b.type === nav.current.blockKey);
        const blockIndex = nav.current.blockIndex ?? 0;
        const blockItems = (selectedSection.data[blockSchema?.dataKey ?? ''] as Record<string, unknown>[]) ?? [];
        const blockData = blockItems[blockIndex];

        if (!blockSchema || !blockData) {
          return (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <p className="text-xs text-[#6b7280] text-center mt-8">Block not found.</p>
            </div>
          );
        }

        return (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-icons text-base text-[#9ca3af]">{BLOCK_ICONS[blockSchema.type] || blockSchema.icon || 'extension'}</span>
              <p className="text-[13px] font-semibold text-[#111827]">
                {blockSchema.singularLabel} #{blockIndex + 1}
              </p>
            </div>
            <BlockEditor
              schema={blockSchema}
              data={blockData}
              onChange={(updatedBlock) => {
                const updatedItems = [...blockItems];
                updatedItems[blockIndex] = updatedBlock;
                onUpdateSection(selectedSection.id, {
                  ...selectedSection.data,
                  [blockSchema.dataKey]: updatedItems,
                });
              }}
              siteId={siteId}
              businessId={businessId}
            />
          </div>
        );
      })()}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
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
  // Desktop mode: fixed 300px left panel
  if (!isDrawer) {
    return (
      <div className="w-[300px] border-r border-[#e5e7eb] flex-shrink-0 h-full overflow-hidden">
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
          'fixed left-0 top-12 bottom-0 w-[300px] z-50 md:hidden transition-transform duration-200 shadow-2xl',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <PanelContent {...panelProps} />
      </div>
    </>
  );
}
