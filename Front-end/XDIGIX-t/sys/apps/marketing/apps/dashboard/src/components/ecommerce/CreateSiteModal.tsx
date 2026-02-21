import { useState, FormEvent } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (siteData: { name: string; description?: string }) => Promise<void>;
};

const CreateSiteModal = ({ open, onClose, onCreate }: Props) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      alert('Please enter a site name');
      return;
    }

    setCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined
      });
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Failed to create site:', error);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-primary">Create New Site</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="p-2 rounded-full hover:bg-base transition-colors"
          >
            <span className="material-icons text-madas-text/60">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">
              Site Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Store"
              disabled={creating}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your website..."
              disabled={creating}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 resize-none"
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After creating the site, the website builder will open in a new tab where you can start designing your website.
            </p>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={creating || !name.trim()}
            className="flex-1 rounded-lg bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-icons animate-spin text-base">progress_activity</span>
                Creating...
              </span>
            ) : (
              'Create Site'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSiteModal;

