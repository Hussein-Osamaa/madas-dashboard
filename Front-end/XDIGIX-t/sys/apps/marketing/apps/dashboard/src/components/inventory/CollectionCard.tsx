import clsx from 'clsx';
import { Collection, CollectionStatus, CollectionType } from '../../services/collectionsService';
import { InventoryViewMode } from './ProductCard';

type Props = {
  collection: Collection;
  viewMode: InventoryViewMode;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
};

const statusStyles: Record<CollectionStatus, string> = {
  active: 'bg-green-100 text-green-600',
  draft: 'bg-orange-100 text-orange-600',
  archived: 'bg-gray-200 text-gray-600'
};

const typeStyles: Record<CollectionType, string> = {
  manual: 'bg-gray-100 text-gray-600',
  smart: 'bg-blue-100 text-blue-700'
};

const typeIcons: Record<CollectionType, string> = {
  manual: 'collections',
  smart: 'auto_awesome'
};

function toDisplayDate(value: unknown): string {
  if (value == null) return 'Unknown';
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') d = (value as { toDate: () => Date }).toDate();
  else if (typeof value === 'number') d = new Date(value);
  else if (typeof value === 'string') d = new Date(value);
  else if (typeof value === 'object' && value !== null && ('seconds' in value || '_seconds' in value)) {
    const sec = (value as { seconds?: number; _seconds?: number }).seconds ?? (value as { _seconds?: number })._seconds;
    if (typeof sec === 'number') d = new Date(sec * 1000);
  }
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : 'Unknown';
}

const CollectionCard = ({ collection, viewMode, onEdit, onView, onDelete }: Props) => {
  const { name, description, type, status, productCount, createdAt } = collection;
  const statusClassName = statusStyles[status] ?? statusStyles.draft;
  const typeClassName = typeStyles[type] ?? typeStyles.manual;
  const icon = typeIcons[type] ?? typeIcons.manual;
  const createdLabel = toDisplayDate(createdAt);

  const body = (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-primary">{name || 'Untitled collection'}</h3>
            <span className={clsx('rounded-full px-2 py-1 text-xs font-medium', typeClassName)}>
              {type === 'smart' ? 'Smart' : 'Manual'}
            </span>
          </div>
          <span className={clsx('rounded-full px-2 py-1 text-xs font-medium capitalize', statusClassName)}>
            {status}
          </span>
        </div>
        <p className="text-sm text-madas-text/70">{description || 'No description provided.'}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm text-madas-text/60 sm:grid-cols-4">
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-madas-text/50">Products</dt>
          <dd className="text-sm font-medium text-primary">{productCount ?? 0}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-madas-text/50">Created</dt>
          <dd className="text-sm font-medium text-primary">{createdLabel}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-madas-text/50">Type</dt>
          <dd className="text-sm font-medium text-primary capitalize">{type}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-madas-text/50">Status</dt>
          <dd className="text-sm font-medium text-primary capitalize">{status}</dd>
        </div>
      </dl>

      <footer className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-madas-text transition-colors hover:bg-base"
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-madas-text transition-colors hover:bg-base"
          onClick={onView}
        >
          View
        </button>
        <button
          type="button"
          className="rounded-lg border border-red-200 px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
          onClick={onDelete}
        >
          Delete
        </button>
      </footer>
    </div>
  );

  return (
    <article
      className={clsx(
        'card-hover relative rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md',
        viewMode === 'list'
          ? 'flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:gap-6'
          : 'space-y-4 px-6 py-5'
      )}
    >
      <div
        className={clsx(
          'flex size-16 shrink-0 items-center justify-center rounded-xl text-white',
          type === 'smart'
            ? 'bg-gradient-to-br from-blue-500 to-purple-500'
            : 'bg-gradient-to-br from-primary/80 to-primary'
        )}
      >
        <span className="material-icons text-2xl">{icon}</span>
      </div>
      {body}
    </article>
  );
};

export default CollectionCard;

