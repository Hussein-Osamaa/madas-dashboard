import { useState, useEffect } from 'react';
import { Review } from '../../hooks/useReviews';

type Props = {
  open: boolean;
  onClose: () => void;
  review: Review;
  onSave: (payload: Partial<Review>) => Promise<void>;
};

const ReviewModal = ({ open, onClose, review, onSave }: Props) => {
  const [status, setStatus] = useState<Review['status']>(review.status);
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(review.status);
      setRating(review.rating);
      setComment(review.comment);
    }
  }, [open, review]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({ status, rating, comment });
    } catch (error) {
      console.error('Failed to save review:', error);
      alert('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-primary">Edit Review</h2>
            <p className="text-sm text-madas-text/70">{review.productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-full hover:bg-base transition-colors"
          >
            <span className="material-icons text-madas-text/60">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Customer</label>
            <input
              type="text"
              value={review.customerName}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-madas-text/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Rating</label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className="material-icons text-2xl"
                  style={{ color: i < rating ? '#FFD300' : '#D1D5DB' }}
                >
                  star
                </button>
              ))}
              <span className="text-sm text-madas-text/70 ml-2">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Review['status'])}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;

