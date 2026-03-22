import { useState } from 'react';
import { PixelItem } from '../../../utils/pixelScripts';

interface GoogleTagTabProps {
  tags: PixelItem[];
  onSave: (tags: PixelItem[]) => Promise<boolean>;
  saving: boolean;
}

const GoogleTagTab = ({ tags, onSave, saving }: GoogleTagTabProps) => {
  const [localTags, setLocalTags] = useState<PixelItem[]>(tags);

  const handleAdd = () => {
    const newTag: PixelItem = {
      id: `google-${Date.now()}`,
      name: '',
      pixelId: '',
      enabled: true,
      createdAt: new Date(),
    };
    setLocalTags([...localTags, newTag]);
  };

  const handleRemove = (id: string) => {
    setLocalTags(localTags.filter(t => t.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<PixelItem>) => {
    setLocalTags(localTags.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleSave = async () => {
    const success = await onSave(localTags);
    if (success) {
      alert('Google Tags saved successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Google Tag (GA4)</h2>
        <p className="text-sm text-gray-500">
          Add and manage your Google Analytics 4 Measurement IDs.
        </p>
      </div>

      <div className="space-y-4">
        {localTags.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-icons text-4xl mb-2 block">analytics</span>
            <p>No Google Tags configured yet.</p>
            <p className="text-sm mt-1">Click "Add Google Tag" to get started.</p>
          </div>
        ) : (
          localTags.map((tag) => (
            <div key={tag.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">
                  {tag.name || `Google Tag ${localTags.indexOf(tag) + 1}`}
                </h3>
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={tag.name || ''}
                    onChange={(e) => handleUpdate(tag.id, { name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., Main Store Analytics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Tag ID (Measurement ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tag.pixelId}
                    onChange={(e) => handleUpdate(tag.id, { pixelId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., G-XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tag.enabled !== false}
                    onChange={(e) => handleUpdate(tag.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-500">Enabled</span>
                </label>
                <p className="text-xs text-gray-400">
                  Find your Measurement ID in Google Analytics 4
                </p>
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
          <span>Add Google Tag</span>
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

export default GoogleTagTab;

