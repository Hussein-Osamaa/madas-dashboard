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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Custom Scripts</h2>
        <p className="text-sm text-gray-500">
          Add and manage custom tracking scripts and analytics code.
        </p>
      </div>

      <div className="space-y-4">
        {localScripts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-icons text-4xl mb-2 block">code</span>
            <p>No Custom Scripts configured yet.</p>
            <p className="text-sm mt-1">Click "Add Custom Script" to get started.</p>
          </div>
        ) : (
          localScripts.map((script) => (
            <div key={script.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Script Name (Optional)
                </label>
                <input
                  type="text"
                  value={script.name || ''}
                  onChange={(e) => handleUpdate(script.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., Custom Analytics Script"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Script Code <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={script.script}
                  onChange={(e) => handleUpdate(script.id, { script: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                  placeholder="Paste your custom tracking script here..."
                  rows={8}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Paste your complete script code including &lt;script&gt; tags
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={script.enabled !== false}
                    onChange={(e) => handleUpdate(script.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-500">Enabled</span>
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
          className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="material-icons text-base">add</span>
          <span>Add Custom Script</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default CustomScriptTab;

