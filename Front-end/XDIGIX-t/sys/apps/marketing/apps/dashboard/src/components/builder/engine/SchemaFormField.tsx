// src/components/builder/engine/SchemaFormField.tsx
import React from 'react';
import type { FieldSchema } from '../../../types/engine';
import TextField from '../editors/shared/TextField';
import ColorField from '../editors/shared/ColorField';
import ImageField from '../editors/shared/ImageField';
import SelectField from '../editors/shared/SelectField';
import ToggleField from '../editors/shared/ToggleField';
import NumberField from '../editors/shared/NumberField';

interface Props {
  fieldKey: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  /** All field values in the current form — used for showWhen evaluation */
  allValues: Record<string, unknown>;
  /** Context for image uploads */
  siteId?: string;
  businessId?: string;
}

const SchemaFormField: React.FC<Props> = ({
  fieldKey,
  schema,
  value,
  onChange,
  allValues,
  siteId: _siteId,
  businessId: _businessId,
}) => {
  // Conditional display
  if (schema.showWhen) {
    const watchValue = allValues[schema.showWhen.field];
    if (watchValue !== schema.showWhen.equals) return null;
  }

  const strVal = (value ?? schema.defaultValue ?? '') as string;
  const numVal = (value ?? schema.defaultValue ?? 0) as number;
  const boolVal = (value ?? schema.defaultValue ?? false) as boolean;

  switch (schema.type) {
    case 'text':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder}
          maxLength={schema.maxLength}
          helperText={schema.helpText}
        />
      );

    case 'textarea':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder}
          maxLength={schema.maxLength}
          helperText={schema.helpText}
          multiline
          rows={3}
        />
      );

    case 'url':
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder ?? 'https://'}
          helperText={schema.helpText}
        />
      );

    case 'icon':
      return (
        <div className="space-y-1">
          <TextField
            label={schema.label}
            value={strVal}
            onChange={(v) => onChange(v)}
            placeholder={schema.placeholder ?? 'material-icons name'}
            helperText={schema.helpText}
          />
          {strVal && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="material-icons text-gray-600 text-lg">{strVal}</span>
              <span className="text-xs text-gray-500">{strVal}</span>
            </div>
          )}
        </div>
      );

    case 'richtext':
      // Fall back to textarea — RichTextEditor can be wired here if needed
      return (
        <TextField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          placeholder={schema.placeholder}
          multiline
          rows={4}
          helperText={schema.helpText}
        />
      );

    case 'color':
      return (
        <ColorField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
        />
      );

    case 'color-gradient':
      return (
        <ColorField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
          allowGradient
        />
      );

    case 'image':
      // ImageField does not accept an `accept` prop — omitted
      return (
        <ImageField
          label={schema.label}
          value={strVal}
          onChange={(v) => onChange(v)}
        />
      );

    case 'number':
      // NumberField does not have helperText — omitted
      return (
        <NumberField
          label={schema.label}
          value={numVal}
          onChange={(v) => onChange(v)}
          min={schema.min}
          max={schema.max}
          step={schema.step}
          unit={schema.unit}
        />
      );

    case 'range':
      // NumberField does not have helperText — omitted
      return (
        <NumberField
          label={schema.label}
          value={numVal}
          onChange={(v) => onChange(v)}
          min={schema.min ?? 0}
          max={schema.max ?? 100}
          step={schema.step ?? 1}
          unit={schema.unit}
          showSlider
        />
      );

    case 'select':
      return (
        <SelectField
          label={schema.label}
          value={String(value ?? schema.defaultValue ?? '')}
          onChange={(v) => onChange(v)}
          options={(schema.options ?? []).map(o => ({ value: String(o.value), label: o.label }))}
          helperText={schema.helpText}
        />
      );

    case 'toggle':
      return (
        <ToggleField
          label={schema.label}
          value={boolVal}
          onChange={(v) => onChange(v)}
          helperText={schema.helpText}
        />
      );

    case 'date':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{schema.label}</label>
          <input
            type="date"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {schema.helpText && <p className="text-xs text-gray-400">{schema.helpText}</p>}
        </div>
      );

    default:
      return (
        <div className="text-xs text-red-400 p-2 bg-red-50 rounded">
          Unknown field type: {(schema as { type: string }).type} ({fieldKey})
        </div>
      );
  }
};

export default React.memo(SchemaFormField);
