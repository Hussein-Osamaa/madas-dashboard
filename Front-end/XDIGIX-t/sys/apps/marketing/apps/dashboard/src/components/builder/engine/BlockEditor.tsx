// src/components/builder/engine/BlockEditor.tsx
import React from 'react';
import type { BlockSchema } from '../../../types/engine';
import SchemaFormField from './SchemaFormField';

interface Props {
  schema: BlockSchema;
  /** Current block data */
  data: Record<string, unknown>;
  /** Called with full updated block data */
  onChange: (data: Record<string, unknown>) => void;
  siteId?: string;
  businessId?: string;
}

const BlockEditor: React.FC<Props> = ({ schema, data, onChange, siteId, businessId }) => {
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-3">
      {Object.entries(schema.fields).map(([key, fieldSchema]) => (
        <SchemaFormField
          key={key}
          fieldKey={key}
          schema={fieldSchema}
          value={data[key]}
          onChange={(v) => handleFieldChange(key, v)}
          allValues={data}
          siteId={siteId}
          businessId={businessId}
        />
      ))}
    </div>
  );
};

export default React.memo(BlockEditor);
