import React from 'react';

interface ArrayEditorProps<T extends object> {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, onChange: (updated: T) => void) => React.ReactNode;
  createDefault: () => T;
  maxItems?: number;
  addLabel?: string;
}

function ArrayEditor<T extends object>({
  label, items, onChange, renderItem, createDefault, maxItems = 20, addLabel = 'Add Item',
}: ArrayEditorProps<T>) {
  const update = (index: number, updated: T) => {
    const next = [...items];
    next[index] = updated;
    onChange(next);
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => { if (items.length < maxItems) onChange([...items, createDefault()]); };
  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };
  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label} ({items.length})</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveUp(index)} disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded">
                  <span className="material-icons text-sm">keyboard_arrow_up</span>
                </button>
                <button type="button" onClick={() => moveDown(index)} disabled={index === items.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded">
                  <span className="material-icons text-sm">keyboard_arrow_down</span>
                </button>
                <button type="button" onClick={() => remove(index)}
                  className="p-1 text-red-400 hover:text-red-600 rounded">
                  <span className="material-icons text-sm">delete_outline</span>
                </button>
              </div>
            </div>
            {renderItem(item, index, (updated) => update(index, updated))}
          </div>
        ))}
      </div>
      {items.length < maxItems && (
        <button type="button" onClick={add}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-primary border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 hover:border-primary/50 transition-colors">
          <span className="material-icons text-base">add</span>
          {addLabel}
        </button>
      )}
    </div>
  );
}

export default ArrayEditor;
