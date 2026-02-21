import { useMemo, useState } from 'react';
import clsx from 'clsx';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import CollectionCard from '../../components/inventory/CollectionCard';
import CollectionModal from '../../components/inventory/CollectionModal';
import { InventoryViewMode } from '../../components/inventory/ProductCard';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCollections } from '../../hooks/useCollections';
import { useProducts } from '../../hooks/useProducts';
import {
  Collection,
  CollectionDraft,
  CollectionStatus,
  CollectionType
} from '../../services/collectionsService';

type StatusFilter = 'all' | CollectionStatus;
type TypeFilter = 'all' | CollectionType;

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' }
];

const typeFilters: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'manual', label: 'Manual' },
  { value: 'smart', label: 'Smart' }
];

const CollectionsPage = () => {
  const { businessId, permissions, loading } = useBusiness();
  const { products } = useProducts(businessId);
  const {
    collections,
    stats,
    isLoading,
    createCollection,
    updateCollection,
    deleteCollection,
    creating,
    updating,
    deleting
  } = useCollections(businessId);

  const [viewMode, setViewMode] = useState<InventoryViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { hasPermission } = useBusiness();
  const canEdit = hasPermission('collection_update') || 
                  hasPermission('collection_edit') || 
                  permissions?.collection?.includes('update') ||
                  permissions?.collection?.includes('edit') ||
                  permissions?.inventory?.includes('edit');

  const filteredCollections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return collections.filter((collection) => {
      const matchesStatus = statusFilter === 'all' || collection.status === statusFilter;
      const matchesType = typeFilter === 'all' || collection.type === typeFilter;

      if (!term) {
        return matchesStatus && matchesType;
      }

      const haystacks = [
        collection.name,
        collection.description,
        collection.status,
        collection.type,
        collection.productCount?.toString()
      ];

      const matchesSearch = haystacks.some(
        (value) => value && value.toLowerCase().includes(term)
      );

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [collections, searchTerm, statusFilter, typeFilter]);

  const summaryCards = [
    {
      label: 'Total collections',
      value: stats.total,
      icon: 'inventory_2',
      accent: 'bg-blue-100 text-blue-600'
    },
    {
      label: 'Manual collections',
      value: stats.manual,
      icon: 'collections',
      accent: 'bg-purple-100 text-purple-600'
    },
    {
      label: 'Smart collections',
      value: stats.smart,
      icon: 'auto_awesome',
      accent: 'bg-indigo-100 text-indigo-600'
    },
    {
      label: 'Archived',
      value: stats.archived,
      icon: 'inventory',
      accent: 'bg-gray-200 text-gray-600'
    }
  ];

  const openCreateModal = () => {
    setEditingCollection(null);
    setModalOpen(true);
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: CollectionDraft) => {
    if (!businessId) {
      return;
    }

    if (payload.id) {
      const { id, ...rest } = payload;
      await updateCollection({ collectionId: id, payload: rest });
    } else {
      const { id, ...rest } = payload;
      await createCollection(rest as Omit<CollectionDraft, 'id'>);
    }
    setModalOpen(false);
    setEditingCollection(null);
  };

  const handleDelete = async (collectionId: string) => {
    if (!canEdit) return;
    const confirmed = window.confirm('Delete this collection? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingId(collectionId);
      await deleteCollection(collectionId);
    } finally {
      setDeletingId(null);
    }
  };

  const activeDeleting = deleting && deletingId !== null;

  if (loading) {
    return <FullScreenLoader message="Loading business context..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Collections</h1>
          <p className="text-sm text-madas-text/70">
            Organise products into themed groups to power your channels and campaigns.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
          onClick={openCreateModal}
          disabled={!canEdit}
        >
          <span className="material-icons text-base">add</span>
          New collection
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="card-hover rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-madas-text/70">{card.label}</p>
              <span className={clsx('material-icons rounded-lg p-2 text-lg', card.accent)}>
                {card.icon}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-primary">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search collections"
              className="w-48 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {typeFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-2 text-xs transition-colors',
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
              )}
              onClick={() => setViewMode('grid')}
            >
              <span className="material-icons text-base">grid_view</span>
              Grid
            </button>
            <button
              type="button"
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-2 text-xs transition-colors',
                viewMode === 'list' ? 'bg-primary text-white' : 'text-madas-text hover:bg-base'
              )}
              onClick={() => setViewMode('list')}
            >
              <span className="material-icons text-base">view_list</span>
              List
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Loading collections…</p>
          </div>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">collections</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No collections found</h3>
            <p className="text-sm text-madas-text/60">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters or search term.'
                : 'Create your first collection to begin organising products.'}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
            onClick={openCreateModal}
            disabled={!canEdit}
          >
            <span className="material-icons text-base">add</span>
            New collection
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              viewMode={viewMode}
              onEdit={() => openEditModal(collection)}
              onView={() => alert('Collection preview coming soon')}
              onDelete={() => handleDelete(collection.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              viewMode={viewMode}
              onEdit={() => openEditModal(collection)}
              onView={() => alert('Collection preview coming soon')}
              onDelete={() => handleDelete(collection.id)}
            />
          ))}
        </div>
      )}

      <CollectionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCollection(null);
        }}
        onSubmit={handleSubmit}
        onDelete={
          editingCollection
            ? async () => {
                await handleDelete(editingCollection.id);
                setModalOpen(false);
                setEditingCollection(null);
              }
            : undefined
        }
        submitting={creating || updating}
        deleting={activeDeleting}
        initialValue={editingCollection}
        products={products}
      />
    </div>
  );
};

export default CollectionsPage;

