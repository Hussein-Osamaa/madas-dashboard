// src/components/builder/engine/SchemaForm.tsx
import React from 'react';
import type { FieldSchema } from '../../../types/engine';
import SchemaFormField from './SchemaFormField';

interface Props {
  /** Section-level settings schema */
  settings: Record<string, FieldSchema>;
  /** Current section.data values */
  data: Record<string, unknown>;
  /** Called whenever a field changes — passes the full updated data object */
  onChange: (data: Record<string, unknown>) => void;
  siteId?: string;
  businessId?: string;
}

const SchemaForm: React.FC<Props> = ({ settings, data, onChange, siteId, businessId }) => {
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  const entries = Object.entries(settings);
  if (entries.length === 0) return null;

  return (
    <div className="p-4 space-y-4">
      {entries.map(([key, schema]) => (
        <SchemaFormField
          key={key}
          fieldKey={key}
          schema={schema}
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

export default React.memo(SchemaForm);
