import { memo } from 'react';
import { SectionType } from '../../types/builder';
import { SECTION_REGISTRY } from '../../registry/sectionRegistry';

interface Props {
  sectionType: SectionType;
  onAddBlock: (blockType: string, defaultData: Record<string, unknown>) => void;
}

const AddBlockButton = ({ sectionType, onAddBlock }: Props) => {
  const entry = SECTION_REGISTRY[sectionType];
  const blockSchemas = entry?.blocks;
  if (!blockSchemas || blockSchemas.length === 0) return null;

  return (
    <div className="flex justify-center py-3">
      <div className="flex gap-1.5 flex-wrap justify-center">
        {blockSchemas.map((schema) => (
          <button
            key={schema.type}
            type="button"
            data-block-action="add"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const newBlock = schema.createDefault();
              onAddBlock(schema.dataKey, newBlock);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-[#27491F] bg-white border border-dashed border-[#27491F]/30 rounded hover:border-[#27491F] hover:bg-[#e8f0e6] transition-colors"
          >
            <span className="material-icons" style={{ fontSize: '12px' }}>add</span>
            {schema.singularLabel || schema.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default memo(AddBlockButton);
