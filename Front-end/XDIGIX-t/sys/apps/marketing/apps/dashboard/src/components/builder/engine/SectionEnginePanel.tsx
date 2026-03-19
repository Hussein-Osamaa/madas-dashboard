// src/components/builder/engine/SectionEnginePanel.tsx
import React from 'react';
import type { Section, SectionType } from '../../../types/builder';
import { SECTION_REGISTRY } from '../../../registry/sectionRegistry';
import SchemaForm from './SchemaForm';
import BlockListEditor from './BlockListEditor';
import StylePanel from '../editors/shared/StylePanel';

interface Props {
  section: Section;
  onUpdate: (data: Record<string, unknown>) => void;
  onClose?: () => void;
  businessId?: string;
  siteId?: string;
  /** When embedded in BuilderLeftPanel, suppress the outer wrapper padding */
  embedded?: boolean;
  /** Which tab to show ('content' | 'style') — driven by BuilderLeftPanel */
  activeTabOverride?: 'content' | 'style' | 'analytics';
}

const SectionEnginePanel: React.FC<Props> = ({
  section,
  onUpdate,
  businessId,
  siteId,
  embedded,
  activeTabOverride,
}) => {
  const entry = SECTION_REGISTRY[section.type as SectionType];

  if (!entry) {
    return (
      <div className="p-4 text-sm text-red-500">
        No engine schema registered for section type: {section.type}
      </div>
    );
  }

  const { settings, blocks } = entry;
  const activeTab = activeTabOverride ?? 'content';

  const hasSettings = Object.keys(settings ?? {}).length > 0;
  const hasBlocks = blocks && blocks.length > 0;

  const showSettings = activeTab !== 'style';
  const showBlocks = activeTab !== 'style';
  const showStyle = !embedded || activeTab === 'style';

  if (!hasSettings && !hasBlocks) {
    return (
      <div className="p-4 text-sm text-gray-400 text-center">
        No configurable settings for this section.
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'divide-y divide-gray-100'}>
      {showSettings && hasSettings && (
        <SchemaForm
          settings={settings}
          data={section.data}
          onChange={onUpdate}
          siteId={siteId}
          businessId={businessId}
        />
      )}

      {showBlocks && hasBlocks && blocks.map((blockSchema) => (
        <BlockListEditor
          key={blockSchema.type}
          schema={blockSchema}
          items={(section.data[blockSchema.dataKey] as Record<string, unknown>[]) ?? []}
          onChange={(items) => onUpdate({ ...section.data, [blockSchema.dataKey]: items })}
          siteId={siteId}
          businessId={businessId}
        />
      ))}

      {showStyle && (
        <StylePanel section={section} onUpdate={onUpdate} />
      )}
    </div>
  );
};

export default React.memo(SectionEnginePanel);
