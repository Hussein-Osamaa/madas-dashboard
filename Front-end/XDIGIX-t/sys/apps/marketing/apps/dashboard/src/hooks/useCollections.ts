import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Collection,
  CollectionDraft,
  createCollection,
  deleteCollection,
  fetchCollections,
  updateCollection
} from '../services/collectionsService';

const collectionsKey = (businessId?: string) => ['collections', businessId] as const;

export const useCollections = (businessId?: string) => {
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: collectionsKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () => fetchCollections(businessId!),
    initialData: [] as Collection[]
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: collectionsKey(businessId) }).catch((error) => {
      console.error('[useCollections] Failed to invalidate cache', error);
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Omit<CollectionDraft, 'id'>) => createCollection(businessId!, payload),
    onSuccess: invalidate
  });

  const updateMutation = useMutation({
    mutationFn: ({ collectionId, payload }: { collectionId: string; payload: Partial<CollectionDraft> }) =>
      updateCollection(businessId!, collectionId, payload),
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: (collectionId: string) => deleteCollection(businessId!, collectionId),
    onSuccess: invalidate
  });

  const collections = collectionsQuery.data ?? [];

  const stats = useMemo(() => {
    const total = collections.length;
    const manual = collections.filter((collection) => collection.type === 'manual').length;
    const smart = collections.filter((collection) => collection.type === 'smart').length;
    const active = collections.filter((collection) => collection.status === 'active').length;
    const archived = collections.filter((collection) => collection.status === 'archived').length;

    return { total, manual, smart, active, archived };
  }, [collections]);

  return {
    collections,
    stats,
    isLoading: collectionsQuery.isLoading,
    createCollection: createMutation.mutateAsync,
    updateCollection: updateMutation.mutateAsync,
    deleteCollection: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending
  };
};

export type { Collection };

