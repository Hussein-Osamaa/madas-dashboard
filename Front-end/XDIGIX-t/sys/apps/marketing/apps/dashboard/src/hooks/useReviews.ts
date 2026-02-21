import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  deleteReview,
  fetchReviews,
  Review,
  ReviewDraft,
  updateReview
} from '../services/reviewsService';

const reviewsKey = (businessId?: string) => ['reviews', businessId] as const;

export const useReviews = (businessId?: string) => {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: reviewsKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () => fetchReviews(businessId!),
    initialData: [] as Review[]
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: reviewsKey(businessId) }).catch((error) => {
      console.error('[useReviews] Failed to invalidate cache', error);
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Omit<ReviewDraft, 'id'>) => createReview(businessId!, payload),
    onSuccess: invalidate
  });

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: Partial<ReviewDraft> }) =>
      updateReview(businessId!, reviewId, payload),
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(businessId!, reviewId),
    onSuccess: invalidate
  });

  const reviews = reviewsQuery.data ?? [];

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((review) => review.status === 'pending').length;
    const approved = reviews.filter((review) => review.status === 'approved').length;
    const hidden = reviews.filter((review) => review.status === 'hidden').length;
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length
    };

    return { total, pending, approved, hidden, averageRating, ratingDistribution };
  }, [reviews]);

  return {
    reviews,
    stats,
    isLoading: reviewsQuery.isLoading,
    createReview: createMutation.mutateAsync,
    updateReview: updateMutation.mutateAsync,
    deleteReview: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending
  };
};

export type { Review, ReviewDraft };

