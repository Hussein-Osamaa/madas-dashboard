import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { inbound, damage, missing } from '../lib/api';

type Action = 'inbound' | 'damage' | 'missing';

const labels: Record<Action, { title: string; verb: string }> = {
  inbound: { title: 'Inbound', verb: 'Record' },
  damage: { title: 'Damage', verb: 'Mark' },
  missing: { title: 'Missing', verb: 'Record' },
};

const apis = { inbound, damage, missing };

export default function TransactionFormPage({ action = 'inbound' }: { action?: Action }) {
  const navigate = useNavigate();
  const act = action;
  const { title, verb } = labels[act] || labels.inbound;
  const api = apis[act] || inbound;

  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const q = parseInt(quantity, 10);
    if (!clientId || !productId || isNaN(q) || q < 1) {
      setError('Client ID, Product ID, and a positive quantity are required.');
      return;
    }
    setLoading(true);
    try {
      await api(clientId.trim(), productId.trim(), q, referenceId.trim() || undefined);
      navigate('/transactions');
    } catch (err) {
      setError((err as Error).message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {verb} stock. Client ID is the business/merchant whose inventory you are updating.
      </p>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client ID *</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
            placeholder="business_xxx"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product ID *</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
            placeholder="product_xxx"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference (optional)</label>
          <input
            type="text"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
            placeholder="PO-123, etc."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : verb}
        </button>
      </form>
    </div>
  );
}
