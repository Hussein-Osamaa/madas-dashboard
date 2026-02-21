import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; code?: string }) => Promise<void>;
  submitting?: boolean;
};

const WarehouseModal = ({ open, onClose, onSubmit, submitting }: Props) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setCode('');
    setError(null);
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    await onSubmit({ name: name.trim(), code: code.trim() || undefined });
    reset();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">Add Warehouse</h2>
            <p className="text-xs text-madas-text/60">
              Create a new storage location to track inventory by warehouse.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-madas-text/60 hover:bg-base transition-colors"
            onClick={handleClose}
            disabled={submitting}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <label className="flex flex-col gap-2 text-sm text-madas-text/80">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Main Warehouse"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-madas-text/80">
            Code (optional)
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="WH-001"
            />
          </label>

          {error ? <p className="text-xs text-red-500">{error}</p> : null}

          <footer className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="material-icons animate-spin text-base">progress_activity</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-icons text-base">add_home_work</span>
                  Add Warehouse
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default WarehouseModal;

