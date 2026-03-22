// src/components/builder/BlockWrapper.tsx
// Wraps individual block content in the canvas with hover edit/delete controls.
// Uses Tailwind group-hover for reliable CSS-based hover detection.

import { memo, type ReactNode } from 'react';

interface Props {
  /** Key in section.data that holds this block's array (e.g. 'blocks', 'items', 'stats') */
  dataKey: string;
  /** Index of this block within the dataKey array */
  blockIndex: number;
  /** Block type label (e.g. "heading", "text", "buttons") */
  blockType: string;
  /** Whether the parent section is selected */
  isSelected: boolean;
  /** Called when the edit button is clicked */
  onEdit: (dataKey: string, blockIndex: number) => void;
  /** Called when the delete button is clicked */
  onDelete: (dataKey: string, blockIndex: number) => void;
  children: ReactNode;
}

const BLOCK_TYPE_ICONS: Record<string, string> = {
  heading: 'title',
  text: 'text_fields',
  buttons: 'smart_button',
  button: 'smart_button',
  caption: 'label',
  email_form: 'mail',
  image: 'image',
  image_block: 'image',
  link_list: 'link',
  text_block: 'article',
  announcement: 'campaign',
  product_block: 'inventory_2',
  column: 'view_column',
  stat: 'bar_chart',
  team_member: 'person',
  row: 'view_agenda',
  testimonial: 'format_quote',
  collapsible_row: 'unfold_more',
  pricing_plan: 'sell',
  partner: 'business',
  collection: 'collections',
  paragraph: 'text_fields',
  menu_item: 'link',
};

const BlockWrapper = ({ dataKey, blockIndex, blockType, isSelected, onEdit, onDelete, children }: Props) => {
  if (!isSelected) return <>{children}</>;

  const icon = BLOCK_TYPE_ICONS[blockType] || 'widgets';
  const label = blockType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="relative group/block">
      {/* Dashed outline — visible on hover */}
      <div className="absolute inset-0 border-[1.5px] border-dashed border-[#27491F]/50 rounded-[2px] pointer-events-none z-[15] opacity-0 group-hover/block:opacity-100 transition-opacity" />

      {/* Block type chip — top left */}
      <div className="absolute -top-5 left-1 z-[25] flex items-center gap-1 bg-[#27491F] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-t select-none pointer-events-none whitespace-nowrap opacity-0 group-hover/block:opacity-100 transition-opacity">
        <span className="material-icons" style={{ fontSize: '10px' }}>{icon}</span>
        {label}
      </div>

      {/* Action buttons — top right */}
      <div className="absolute -top-1 right-1 z-[25] flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <button
          type="button"
          data-block-action="edit"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(dataKey, blockIndex); }}
          className="w-6 h-6 rounded bg-white/95 backdrop-blur text-[#6b7280] hover:text-[#27491F] hover:bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] flex items-center justify-center transition-colors"
          title={`Edit ${label}`}
        >
          <span className="material-icons" style={{ fontSize: '13px' }}>edit</span>
        </button>
        <button
          type="button"
          data-block-action="delete"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(dataKey, blockIndex); }}
          className="w-6 h-6 rounded bg-white/95 backdrop-blur text-[#6b7280] hover:text-red-500 hover:bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)] flex items-center justify-center transition-colors"
          title={`Delete ${label}`}
        >
          <span className="material-icons" style={{ fontSize: '13px' }}>delete</span>
        </button>
      </div>

      {children}
    </div>
  );
};

export default memo(BlockWrapper);
