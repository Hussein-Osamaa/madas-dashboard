import { useState } from 'react';
import { CustomScriptItem } from '../../../utils/pixelScripts';

interface CustomScriptTabProps {
  scripts: CustomScriptItem[];
  onSave: (scripts: CustomScriptItem[]) => Promise<boolean>;
  saving: boolean;
}

const CustomScriptTab = ({ scripts, onSave, saving }: CustomScriptTabProps) => {
  const [localScripts, setLocalScripts] = useState<CustomScriptItem[]>(scripts);

  const handleAdd = () => {
    const newScript: CustomScriptItem = {
      id: `custom-${Date.now()}`,
      name: '',
      script: '',
      enabled: true,
      createdAt: new Date(),
    };
    setLocalScripts([...localScripts, newScript]);
  };

  const handleRemove = (id: string) => {
    setLocalScripts(localScripts.filter(s => s.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<CustomScriptItem>) => {
    setLocalScripts(localScripts.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSave = async () => {
    const success = await onSave(localScripts);
    if (success) {
      alert('Custom Scripts saved successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-2">Custom Scripts</h2>
        <p className="text-sm text-madas-text/70">
          Add and manage custom tracking scripts and analytics code.
        </p>
      </div>

      <div className="space-y-4">
        {localScripts.length === 0 ? (
          <div className="text-center py-8 text-madas-text/60">
            <span className="material-icons text-4xl mb-2 block">code</span>
            <p>No Custom Scripts configured yet.</p>
            <p className="text-sm mt-1">Click "Add Custom Script" to get started.</p>
          </div>
        ) : (
          localScripts.map((script) => (
            <div key={script.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-madas-text/80">
                  {script.name || `Custom Script ${localScripts.indexOf(script) + 1}`}
                </h3>
                <button
                  type="button"
                  onClick={() => handleRemove(script.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                  Script Name (Optional)
                </label>
                <input
                  type="text"
                  value={script.name || ''}
                  onChange={(e) => handleUpdate(script.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., Custom Analytics Script"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-madas-text/80 mb-2">
                  Script Code <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={script.script}
                  onChange={(e) => handleUpdate(script.id, { script: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
                  placeholder="Paste your custom tracking script here..."
                  rows={8}
                />
                <p className="mt-1 text-xs text-madas-text/60">
                  Paste your complete script code including &lt;script&gt; tags
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={script.enabled !== false}
                    onChange={(e) => handleUpdate(script.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-madas-text/70">Enabled</span>
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/80 hover:bg-base transition-colors"
        >
          <span className="material-icons text-base">add</span>
          <span>Add Custom Script</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default CustomScriptTab;

