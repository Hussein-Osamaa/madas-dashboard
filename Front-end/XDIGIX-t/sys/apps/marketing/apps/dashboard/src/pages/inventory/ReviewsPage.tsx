import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { useReviews, Review } from '../../hooks/useReviews';
import ReviewModal from '../../components/inventory/ReviewModal';
import ReplyModal from '../../components/inventory/ReplyModal';

type StatusFilter = 'all' | 'pending' | 'approved' | 'hidden';
type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

const ReviewsPage = () => {
  const { businessId, permissions, loading } = useBusiness();
  const { reviews, stats, isLoading, updateReview, deleteReview, updating, deleting } = useReviews(businessId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [replyingToReview, setReplyingToReview] = useState<Review | null>(null);

  const { hasPermission } = useBusiness();
  const canEdit = hasPermission('reviews_manage') || 
                  hasPermission('reviews_edit') || 
                  permissions?.reviews?.includes('manage') ||
                  permissions?.reviews?.includes('edit') ||
                  permissions?.inventory?.includes('edit');

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const matchesSearch =
        !searchQuery.trim() ||
        review.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.comment?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
      const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter;

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter]);

  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedReviews.size === filteredReviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(filteredReviews.map((r) => r.id)));
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      await updateReview({ reviewId, payload: { status: 'approved' } });
    } catch (error) {
      console.error('Failed to approve review:', error);
      alert('Failed to approve review');
    }
  };

  const handleHide = async (reviewId: string) => {
    try {
      await updateReview({ reviewId, payload: { status: 'hidden' } });
    } catch (error) {
      console.error('Failed to hide review:', error);
      alert('Failed to hide review');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await deleteReview(reviewId);
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert('Failed to delete review');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedReviews.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedReviews).map((id) => updateReview({ reviewId: id, payload: { status: 'approved' } }))
      );
      setSelectedReviews(new Set());
    } catch (error) {
      console.error('Failed to approve reviews:', error);
      alert('Failed to approve some reviews');
    }
  };

  const handleBulkHide = async () => {
    if (selectedReviews.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedReviews).map((id) => updateReview({ reviewId: id, payload: { status: 'hidden' } }))
      );
      setSelectedReviews(new Set());
    } catch (error) {
      console.error('Failed to hide reviews:', error);
      alert('Failed to hide some reviews');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReviews.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedReviews.size} review(s)?`)) return;
    try {
      await Promise.all(Array.from(selectedReviews).map((id) => deleteReview(id)));
      setSelectedReviews(new Set());
    } catch (error) {
      console.error('Failed to delete reviews:', error);
      alert('Failed to delete some reviews');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={clsx('material-icons text-sm', i < rating ? 'text-yellow-400' : 'text-gray-300')}
      >
        star
      </span>
    ));
  };

  const getRatingBadgeClass = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-600';
    if (rating >= 3.5) return 'bg-blue-100 text-blue-600';
    if (rating >= 2.5) return 'bg-yellow-100 text-yellow-600';
    return 'bg-red-100 text-red-600';
  };

  const getStatusBadgeClass = (status: Review['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-600';
      case 'pending':
        return 'bg-yellow-100 text-yellow-600';
      case 'hidden':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-semibold text-primary">Product Reviews</h1>
        <p className="text-sm text-madas-text/70">Manage and moderate customer reviews</p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total Reviews</p>
            <span className="material-icons rounded-lg p-2 text-lg bg-blue-100 text-blue-600">rate_review</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.total}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Pending</p>
            <span className="material-icons rounded-lg p-2 text-lg bg-yellow-100 text-yellow-600">schedule</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.pending}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Approved</p>
            <span className="material-icons rounded-lg p-2 text-lg bg-green-100 text-green-600">check_circle</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.approved}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Hidden</p>
            <span className="material-icons rounded-lg p-2 text-lg bg-gray-100 text-gray-600">visibility_off</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{stats.hidden}</p>
        </article>
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Avg Rating</p>
            <span className="material-icons rounded-lg p-2 text-lg bg-purple-100 text-purple-600">star</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
          </p>
        </article>
      </section>

      {/* Filters and Search */}
      <section className="rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedReviews.size === filteredReviews.length && filteredReviews.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
          />
          <span>{selectedReviews.size} selected</span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
          {selectedReviews.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={!canEdit || updating}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
              >
                Approve Selected
              </button>
              <button
                type="button"
                onClick={handleBulkHide}
                disabled={!canEdit || updating}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text/70 hover:bg-base transition-colors disabled:opacity-60"
              >
                Hide Selected
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={!canEdit || deleting}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                Delete Selected
              </button>
            </>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">filter_list</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-transparent text-xs text-madas-text focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">star</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
              className="bg-transparent text-xs text-madas-text focus:outline-none"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-icons text-6xl text-madas-text/30 mb-4">rate_review</span>
          <p className="text-lg font-medium text-madas-text/70 mb-2">No reviews found</p>
          <p className="text-sm text-madas-text/60">
            {searchQuery || statusFilter !== 'all' || ratingFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Reviews will appear here when customers leave feedback'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {review.customerName?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-primary">{review.customerName}</h4>
                      <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', getRatingBadgeClass(review.rating))}>
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', getStatusBadgeClass(review.status))}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                      {review.createdAt && (
                        <span className="text-sm text-madas-text/60">
                          {format(review.createdAt, 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-primary font-medium mb-2">{review.productName}</p>
                  {review.title && <p className="text-sm font-medium text-madas-text/80 mb-2">{review.title}</p>}
                  <p className="text-madas-text/70 mb-4">{review.comment}</p>
                  {review.reply && (
                    <div className="mt-4 pl-4 border-l-2 border-primary/30">
                      <p className="text-sm font-medium text-primary mb-1">Your Reply:</p>
                      <p className="text-sm text-madas-text/70">{review.reply}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-madas-text/60">
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-sm">thumb_up</span>
                      <span>{review.helpfulCount ?? 0} helpful</span>
                    </span>
                    {!review.reply && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToReview(review);
                          setReplyModalOpen(true);
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <span className="material-icons text-sm">reply</span>
                        <span>Reply</span>
                      </button>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex-shrink-0 flex gap-2">
                    {review.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(review.id)}
                        disabled={updating}
                        className="p-2 text-madas-text/60 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-60"
                        title="Approve"
                      >
                        <span className="material-icons">check</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReview(review);
                        setReviewModalOpen(true);
                      }}
                      className="p-2 text-madas-text/60 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    {review.status !== 'hidden' && (
                      <button
                        type="button"
                        onClick={() => handleHide(review.id)}
                        disabled={updating}
                        className="p-2 text-madas-text/60 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-60"
                        title="Hide"
                      >
                        <span className="material-icons">visibility_off</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      disabled={deleting}
                      className="p-2 text-madas-text/60 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-60"
                      title="Delete"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modals */}
      {reviewModalOpen && editingReview && (
        <ReviewModal
          open={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setEditingReview(null);
          }}
          review={editingReview}
          onSave={async (payload) => {
            await updateReview({ reviewId: editingReview.id, payload });
            setReviewModalOpen(false);
            setEditingReview(null);
          }}
        />
      )}

      {replyModalOpen && replyingToReview && (
        <ReplyModal
          open={replyModalOpen}
          onClose={() => {
            setReplyModalOpen(false);
            setReplyingToReview(null);
          }}
          review={replyingToReview}
          onSave={async (reply) => {
            await updateReview({ reviewId: replyingToReview.id, payload: { reply } });
            setReplyModalOpen(false);
            setReplyingToReview(null);
          }}
        />
      )}
    </div>
  );
};

export default ReviewsPage;

