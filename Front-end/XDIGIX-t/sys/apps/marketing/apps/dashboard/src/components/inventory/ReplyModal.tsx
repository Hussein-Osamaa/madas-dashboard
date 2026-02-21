import { useState, useEffect } from 'react';
import { Review } from '../../hooks/useReviews';

type Props = {
  open: boolean;
  onClose: () => void;
  review: Review;
  onSave: (reply: string) => Promise<void>;
};

const ReplyModal = ({ open, onClose, review, onSave }: Props) => {
  const [reply, setReply] = useState(review.reply || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReply(review.reply || '');
    }
  }, [open, review.reply]);

  const handleSubmit = async () => {
    if (!reply.trim()) {
      alert('Please enter a reply');
      return;
    }
    setSaving(true);
    try {
      await onSave(reply.trim());
    } catch (error) {
      console.error('Failed to save reply:', error);
      alert('Failed to save reply');
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
            <h2 className="text-xl font-semibold text-primary">Reply to Review</h2>
            <p className="text-sm text-madas-text/70">Reply to {review.customerName}'s review</p>
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
          <div className="rounded-lg border border-gray-200 bg-base/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-primary">{review.customerName}</span>
              <span className="text-sm text-madas-text/60">•</span>
              <span className="text-sm text-madas-text/60">{review.productName}</span>
            </div>
            <p className="text-sm text-madas-text/70">{review.comment}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Your Reply</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={6}
              placeholder="Write your reply to this review..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-2 text-xs text-madas-text/60">
              Your reply will be visible to the customer and other visitors.
            </p>
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
            disabled={saving || !reply.trim()}
            className="flex-1 rounded-lg bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md"
          >
            {saving ? 'Saving...' : 'Post Reply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;

