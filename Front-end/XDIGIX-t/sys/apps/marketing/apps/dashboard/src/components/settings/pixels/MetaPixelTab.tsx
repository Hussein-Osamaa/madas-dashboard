import { useState } from 'react';
import { PixelItem } from '../../../utils/pixelScripts';

interface MetaPixelTabProps {
  pixels: PixelItem[];
  onSave: (pixels: PixelItem[]) => Promise<boolean>;
  saving: boolean;
}

const MetaPixelTab = ({ pixels, onSave, saving }: MetaPixelTabProps) => {
  const [localPixels, setLocalPixels] = useState<PixelItem[]>(pixels);

  const handleAdd = () => {
    const newPixel: PixelItem = {
      id: `meta-${Date.now()}`,
      name: '',
      pixelId: '',
      enabled: true,
      createdAt: new Date(),
    };
    setLocalPixels([...localPixels, newPixel]);
  };

  const handleRemove = (id: string) => {
    setLocalPixels(localPixels.filter(p => p.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<PixelItem>) => {
    setLocalPixels(localPixels.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleSave = async () => {
    const success = await onSave(localPixels);
    if (success) {
      alert('Meta Pixels saved successfully!');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-2">Meta Pixel (Facebook Pixel)</h2>
        <p className="text-sm text-madas-text/70">
          Add and manage your Meta Pixel IDs for Facebook tracking.
        </p>
      </div>

      <div className="space-y-4">
        {localPixels.length === 0 ? (
          <div className="text-center py-8 text-madas-text/60">
            <span className="material-icons text-4xl mb-2 block">facebook</span>
            <p>No Meta Pixels configured yet.</p>
            <p className="text-sm mt-1">Click "Add Meta Pixel" to get started.</p>
          </div>
        ) : (
          localPixels.map((pixel) => (
            <div key={pixel.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-madas-text/80">
                  {pixel.name || `Meta Pixel ${localPixels.indexOf(pixel) + 1}`}
                </h3>
                <button
                  type="button"
                  onClick={() => handleRemove(pixel.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Remove"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">
                    Pixel Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={pixel.name || ''}
                    onChange={(e) => handleUpdate(pixel.id, { name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g., Main Store Pixel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-madas-text/80 mb-2">
                    Meta Pixel ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pixel.pixelId}
                    onChange={(e) => handleUpdate(pixel.id, { pixelId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Enter your Meta Pixel ID"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pixel.enabled !== false}
                    onChange={(e) => handleUpdate(pixel.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-madas-text/70">Enabled</span>
                </label>
                <p className="text-xs text-madas-text/60">
                  Find your Pixel ID in Meta Events Manager
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
          className="flex items-center space-x-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/80 hover:bg-base transition-colors"
        >
          <span className="material-icons text-base">add</span>
          <span>Add Meta Pixel</span>
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

export default MetaPixelTab;

