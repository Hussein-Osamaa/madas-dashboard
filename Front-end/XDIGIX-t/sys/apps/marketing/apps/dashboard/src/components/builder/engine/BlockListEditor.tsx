// src/components/builder/engine/BlockListEditor.tsx
import React from 'react';
import type { BlockSchema } from '../../../types/engine';
import BlockEditor from './BlockEditor';
import ArrayEditor from '../editors/shared/ArrayEditor';

interface Props {
  schema: BlockSchema;
  /** Current array of block items from section.data[schema.dataKey] */
  items: Record<string, unknown>[];
  /** Called with the full updated items array */
  onChange: (items: Record<string, unknown>[]) => void;
  siteId?: string;
  businessId?: string;
}

const BlockListEditor: React.FC<Props> = ({ schema, items, onChange, siteId, businessId }) => {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">
        {schema.label}
      </p>
      <ArrayEditor
        label={schema.label}
        items={items}
        onChange={onChange}
        createDefault={schema.createDefault}
        addLabel={`Add ${schema.singularLabel}`}
        maxItems={schema.maxItems}
        renderItem={(item, _index, onItemChange) => (
          <BlockEditor
            schema={schema}
            data={item}
            onChange={onItemChange}
            siteId={siteId}
            businessId={businessId}
          />
        )}
      />
    </div>
  );
};

export default React.memo(BlockListEditor);
