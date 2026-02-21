import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCollections } from '../../hooks/useCollections';
import { doc, db, getDoc, updateDoc, collection, getDocs } from '../../lib/firebase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { trackPageLoad } from '../../lib/performance';
import type { Collection } from '../../services/collectionsService';

type NavigationItemType = 'link' | 'label' | 'collection';

type NavigationItem = {
  id: string;
  type: NavigationItemType;
  label: string;
  url?: string;
  status: 'active' | 'inactive';
  parentId?: string | null;
  collectionId?: string; // For collection items
  children?: NavigationItem[];
};

type NavigationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<NavigationItem, 'id'>) => void;
  item?: NavigationItem | null;
  parentItem?: NavigationItem | null;
  isLabel?: boolean;
};

const NavigationModal = ({ isOpen, onClose, onSave, item, parentItem, isLabel }: NavigationModalProps) => {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (item) {
      setLabel(item.label);
      setUrl(item.url || '');
      setStatus(item.status);
    } else {
      setLabel('');
      setUrl('');
      setStatus('active');
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLabel) {
      // For labels, URL is optional
      onSave({
        type: 'label',
        label: label.trim(),
        url: url.trim() || '#',
        status,
        parentId: parentItem?.id || null
      });
    } else {
      if (!label.trim() || !url.trim()) return;
      onSave({
        type: item?.type || 'link',
        label: label.trim(),
        url: url.trim(),
        status,
        parentId: parentItem?.id || null
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            {isLabel ? 'Add Label' : item ? 'Edit' : 'Add'} {isLabel ? 'Label' : 'Navigation Item'}
            {parentItem ? ' (Sub-item)' : ''}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={isLabel ? "e.g., Collections, Categories" : "e.g., Home, Products"}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {!isLabel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL / Link
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g., /, /products, /about"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use relative paths like /products or absolute URLs</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-[#1f3c19] transition-colors"
              >
                {item ? 'Save Changes' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

type AddCollectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (collectionIds: string[]) => void;
  collections: Collection[];
  labelId: string;
  existingCollectionIds: string[];
};

const AddCollectionModal = ({ isOpen, onClose, onAdd, collections, labelId, existingCollectionIds }: AddCollectionModalProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(existingCollectionIds));
    }
  }, [isOpen, existingCollectionIds]);

  if (!isOpen) return null;

  const availableCollections = collections.filter((c) => c.status === 'active');
  const toggleCollection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = () => {
    onAdd(Array.from(selectedIds));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-primary">Add Collections</h2>
          <p className="text-sm text-gray-500 mt-1">Select collections to add to this label</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {availableCollections.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active collections available</p>
          ) : (
            <div className="space-y-2">
              {availableCollections.map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(collection.id)}
                    onChange={() => toggleCollection(collection.id)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">{collection.name}</span>
                  {collection.description && (
                    <span className="ml-2 text-xs text-gray-500">- {collection.description}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-[#1f3c19] transition-colors"
          >
            Add Collections
          </button>
        </div>
      </div>
    </div>
  );
};

type SortableNavigationItemProps = {
  item: NavigationItem;
  onEdit: (item: NavigationItem) => void;
  onAddChild: (parentItem: NavigationItem) => void;
  onAddCollections?: (labelItem: NavigationItem) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  depth?: number;
  allItems: NavigationItem[];
  collections: Collection[];
};

const SortableNavigationItem = ({
  item,
  onEdit,
  onAddChild,
  onAddCollections,
  onDelete,
  onToggleStatus,
  depth = 0,
  allItems,
  collections
}: SortableNavigationItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const children = allItems.filter(child => child.parentId === item.id);
  const collectionChildren = children.filter(c => c.type === 'collection');
  const otherChildren = children.filter(c => c.type !== 'collection');
  const hasChildren = children.length > 0;
  const isLabel = item.type === 'label';

  // Get collection info for collection items
  const getCollectionInfo = (collectionId?: string) => {
    if (!collectionId) return null;
    return collections.find(c => c.id === collectionId);
  };

  const collectionInfo = item.type === 'collection' ? getCollectionInfo(item.collectionId) : null;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 mb-2 flex items-center gap-3 ${
          isDragging ? 'shadow-lg' : 'shadow-sm'
        } ${isLabel ? 'bg-blue-50 border-blue-200' : ''}`}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          title="Drag to reorder"
        >
          <span className="material-icons text-xl">drag_indicator</span>
        </div>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isLabel && (
              <span className="material-icons text-sm text-blue-600">label</span>
            )}
            {item.type === 'collection' && (
              <span className="material-icons text-sm text-purple-600">collections</span>
            )}
            <span className="font-medium text-gray-900">{item.label}</span>
            <span className="text-sm text-gray-500">({item.label})</span>
          </div>
          {item.url && item.url !== '#' && (
            <div className="text-xs text-gray-500 truncate mt-1">{item.url}</div>
          )}
          {collectionInfo && (
            <div className="text-xs text-purple-600 truncate mt-1">
              Collection: {collectionInfo.name}
            </div>
          )}
        </div>

        {/* Status Dropdown */}
        <select
          value={item.status}
          onChange={() => onToggleStatus(item.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            item.status === 'active'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Add Collections Button (for labels only) */}
        {isLabel && onAddCollections && (
          <button
            type="button"
            onClick={() => onAddCollections(item)}
            className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            title="Add collections"
          >
            <span className="material-icons text-base mr-1 align-middle">add_box</span>
            Add Collections
          </button>
        )}

        {/* Add Sub-item Button */}
        {!isLabel && (
          <button
            type="button"
            onClick={() => onAddChild(item)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Add sub-item"
          >
            <span className="material-icons text-xl">add</span>
          </button>
        )}

        {/* Edit Button */}
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete item"
        >
          <span className="material-icons text-xl">delete</span>
        </button>
      </div>

      {/* Render Collections (if label) */}
      {isLabel && collectionChildren.length > 0 && (
        <div className="space-y-2 ml-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
            Collections
          </div>
          <SortableContext items={collectionChildren.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {collectionChildren.map((child) => (
              <SortableNavigationItem
                key={child.id}
                item={child}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onAddCollections={onAddCollections}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
                depth={depth + 1}
                allItems={allItems}
                collections={collections}
              />
            ))}
          </SortableContext>
        </div>
      )}

      {/* Render Other Children */}
      {otherChildren.length > 0 && (
        <div className="space-y-2">
          {otherChildren.map((child) => (
            <SortableNavigationItem
              key={child.id}
              item={child}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onAddCollections={onAddCollections}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              depth={depth + 1}
              allItems={allItems}
              collections={collections}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const siteIdParam = searchParams.get('siteId');
  
  const { collections, isLoading: collectionsLoading } = useCollections(businessId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [addCollectionModalOpen, setAddCollectionModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [parentItem, setParentItem] = useState<NavigationItem | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<NavigationItem | null>(null);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(siteIdParam);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Track page load performance
  useEffect(() => {
    trackPageLoad('navigation');
  }, []);

  // Load sites if no siteId is provided
  useEffect(() => {
    const loadSites = async () => {
      if (!businessId) return;

      try {
        const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
        const snapshot = await getDocs(sitesRef);
        
        const loadedSites = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name || 'Untitled Site'
        }));

        setSites(loadedSites);

        // If no siteId in URL but sites exist, use the first one
        if (!siteIdParam && loadedSites.length > 0) {
          const firstSiteId = loadedSites[0].id;
          setCurrentSiteId(firstSiteId);
          setSearchParams({ siteId: firstSiteId });
        } else if (siteIdParam) {
          setCurrentSiteId(siteIdParam);
        }
      } catch (error) {
        console.error('Failed to load sites:', error);
      }
    };

    void loadSites();
  }, [businessId, siteIdParam, setSearchParams]);

  // Load navigation for the current site
  useEffect(() => {
    const loadNavigation = async () => {
      if (!businessId || !currentSiteId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const siteRef = doc(db, 'businesses', businessId, 'published_sites', currentSiteId);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const data = siteSnap.data();
          const navigationItems = data.settings?.navigation || [];
          // Unflatten the navigation items
          setItems(navigationItems.length > 0 ? unflattenItems(navigationItems) : getDefaultNavigation());
        } else {
          setItems(getDefaultNavigation());
        }
      } catch (error) {
        console.error('Failed to load navigation:', error);
        setItems(getDefaultNavigation());
      } finally {
        setLoading(false);
      }
    };

    void loadNavigation();
  }, [businessId, currentSiteId]);

  const getDefaultNavigation = (): NavigationItem[] => [
    { id: '1', type: 'link', label: 'Home', url: '/', status: 'active', parentId: null },
    {
      id: '2',
      type: 'link',
      label: 'Our Collection',
      url: '/collection',
      status: 'active',
      parentId: null
    },
    { id: '6', type: 'link', label: 'MADAS Friday', url: '/madas-friday', status: 'active', parentId: null },
    { id: '7', type: 'link', label: 'Sale', url: '/sale', status: 'active', parentId: null },
    { id: '8', type: 'link', label: 'Last pieces', url: '/last-pieces', status: 'active', parentId: null }
  ];

  const flattenItems = (itemsList: NavigationItem[]): NavigationItem[] => {
    const flat: NavigationItem[] = [];
    itemsList.forEach((item) => {
      flat.push(item);
      if (item.children && item.children.length > 0) {
        flat.push(...flattenItems(item.children));
      }
    });
    return flat;
  };

  const unflattenItems = (flatItems: NavigationItem[]): NavigationItem[] => {
    const rootItems: NavigationItem[] = [];
    const itemMap = new Map<string, NavigationItem>();

    // First pass: create map and set up structure
    flatItems.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: build hierarchy
    flatItems.forEach((item) => {
      const mappedItem = itemMap.get(item.id)!;
      if (!item.parentId) {
        rootItems.push(mappedItem);
      } else {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(mappedItem);
        } else {
          // Parent not found, add to root
          rootItems.push(mappedItem);
        }
      }
    });

    return rootItems;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const flatItems = flattenItems(items);
    const activeItem = flatItems.find((item) => item.id === active.id);
    const overItem = flatItems.find((item) => item.id === over.id);

    if (!activeItem || !overItem) return;

    // Prevent dropping a parent into its own child
    const isDescendant = (parentId: string, childId: string): boolean => {
      const children = flatItems.filter((item) => item.parentId === parentId);
      if (children.some((child) => child.id === childId)) return true;
      return children.some((child) => isDescendant(child.id, childId));
    };

    if (isDescendant(String(active.id), String(over.id))) {
      return;
    }

    // Handle dropping collections on labels
    if (activeItem.type === 'collection' && overItem.type === 'label') {
      const updatedItems = flatItems.map((item) => {
        if (item.id === active.id) {
          return { ...item, parentId: String(over.id) };
        }
        return item;
      });
      setItems(unflattenItems(updatedItems as typeof flatItems));
      return;
    }

    // Reorder items with same parent
    const parentId = activeItem.parentId || null;
    const siblings = flatItems.filter((item) => (item.parentId || null) === parentId);
    const oldIndex = siblings.findIndex((item) => item.id === active.id);
    const newIndex = siblings.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(siblings, oldIndex, newIndex);
      const otherItems = flatItems.filter((item) => (item.parentId || null) !== parentId);
      const allItems = [...otherItems, ...reordered];
      setItems(unflattenItems(allItems));
    }
  };

  const handleSave = async () => {
    if (!businessId || !currentSiteId) return;

    setSaving(true);
    try {
      const flatItems = flattenItems(items);
      const siteRef = doc(db, 'businesses', businessId, 'published_sites', currentSiteId);
      
      const siteSnap = await getDoc(siteRef);
      const currentSettings = siteSnap.exists() ? siteSnap.data().settings || {} : {};

      await updateDoc(siteRef, {
        settings: {
          ...currentSettings,
          navigation: flatItems
        },
        updatedAt: new Date()
      });

      alert('Navigation saved successfully!');
    } catch (error) {
      console.error('Failed to save navigation:', error);
      alert('Failed to save navigation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabel = () => {
    setEditingItem(null);
    setParentItem(null);
    setIsAddingLabel(true);
    setModalOpen(true);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setParentItem(null);
    setIsAddingLabel(false);
    setModalOpen(true);
  };

  const handleAddChild = (parent: NavigationItem) => {
    setEditingItem(null);
    setParentItem(parent);
    setModalOpen(true);
  };

  const handleAddCollections = (labelItem: NavigationItem) => {
    setSelectedLabel(labelItem);
    setAddCollectionModalOpen(true);
  };

  const handleSaveCollections = (collectionIds: string[]) => {
    if (!selectedLabel) return;

    const flatItems = flattenItems(items);
    
    // Remove existing collections from this label
    const withoutOldCollections = flatItems.filter(
      item => !(item.type === 'collection' && item.parentId === selectedLabel.id)
    );

    // Add new collections
    const newCollectionItems: NavigationItem[] = collectionIds.map((collectionId) => {
      const collection = collections.find(c => c.id === collectionId);
      return {
        id: `collection-${collectionId}-${Date.now()}`,
        type: 'collection',
        label: collection?.name || 'Collection',
        url: `/collections/${collectionId}`,
        status: 'active',
        parentId: selectedLabel.id,
        collectionId: collectionId
      };
    });

    setItems(unflattenItems([...withoutOldCollections, ...newCollectionItems]));
  };

  const handleEdit = (item: NavigationItem) => {
    setEditingItem(item);
    setParentItem(null);
    setModalOpen(true);
  };

  const handleSaveItem = (itemData: Omit<NavigationItem, 'id'>) => {
    const flatItems = flattenItems(items);

    if (editingItem) {
      const index = flatItems.findIndex((item) => item.id === editingItem.id);
      if (index !== -1) {
        flatItems[index] = { ...flatItems[index], ...itemData };
      }
    } else {
      const newItem: NavigationItem = {
        ...itemData,
        id: Date.now().toString()
      };
      flatItems.push(newItem);
    }

    setItems(unflattenItems(flatItems));
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this navigation item? This will also delete all sub-items.')) {
      return;
    }

    const flatItems = flattenItems(items);
    let cleaned = flatItems.filter((item) => item.id !== id);
    
    // Remove all children recursively
    const removeChildren = (parentId: string) => {
      cleaned = cleaned.filter((item) => {
        if (item.parentId === parentId) {
          removeChildren(item.id);
          return false;
        }
        return true;
      });
    };
    
    removeChildren(id);

    setItems(unflattenItems(cleaned));
  };

  const handleToggleStatus = (id: string) => {
    const flatItems = flattenItems(items);
    const index = flatItems.findIndex((item) => item.id === id);
    if (index !== -1) {
      flatItems[index].status = flatItems[index].status === 'active' ? 'inactive' : 'active';
      setItems(unflattenItems(flatItems));
    }
  };

  if (loading || collectionsLoading) {
    return <FullScreenLoader message="Loading navigation..." />;
  }

  if (sites.length === 0 && !currentSiteId) {
    return (
      <div className="space-y-6 px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-800">No sites found. Please create a site first.</p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="mt-4 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors"
          >
            Go to Website Builder
          </button>
        </div>
      </div>
    );
  }

  if (!currentSiteId) {
    return (
      <div className="space-y-6 px-6 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">Select a Site</h2>
          <div className="space-y-2">
            {sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => {
                  setCurrentSiteId(site.id);
                  setSearchParams({ siteId: site.id });
                }}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{site.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const flatItems = flattenItems(items);
  const rootItems = items.filter((item) => !item.parentId);
  const selectedLabelCollections = selectedLabel
    ? flatItems.filter(item => item.type === 'collection' && item.parentId === selectedLabel.id)
    : [];

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-primary">Navigation elements</h1>
          <p className="text-sm text-madas-text/70">Manage your website navigation menu</p>
          {sites.length > 1 && (
            <div className="mt-2">
              <select
                value={currentSiteId || ''}
                onChange={(e) => {
                  const newSiteId = e.target.value;
                  setCurrentSiteId(newSiteId);
                  setSearchParams({ siteId: newSiteId });
                }}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            <span className="material-icons text-base mr-1 align-middle">arrow_back</span>
            Back
          </button>
          <button
            type="button"
            onClick={handleAddLabel}
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <span className="material-icons text-base mr-1 align-middle">label</span>
            Add Label
          </button>
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            <span className="material-icons text-base mr-1 align-middle">add</span>
            Add Item
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary text-white px-6 py-2 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="material-icons animate-spin text-base">progress_activity</span>
                Saving...
              </span>
            ) : (
              'Save Navigation'
            )}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-icons text-6xl text-gray-300 mb-4 block">navigation</span>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Navigation Items</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first navigation item or label.</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={handleAddLabel}
                className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Add Label
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-lg bg-primary text-white px-6 py-2 text-sm font-semibold hover:bg-[#1f3c19] transition-colors"
              >
                Add Item
              </button>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={flatItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {rootItems.map((item) => (
                  <SortableNavigationItem
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onAddChild={handleAddChild}
                    onAddCollections={handleAddCollections}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    allItems={flatItems}
                    collections={collections}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <NavigationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
          setParentItem(null);
          setIsAddingLabel(false);
        }}
        onSave={handleSaveItem}
        item={editingItem}
        parentItem={parentItem}
        isLabel={isAddingLabel || (editingItem?.type === 'label')}
      />

      <AddCollectionModal
        isOpen={addCollectionModalOpen}
        onClose={() => {
          setAddCollectionModalOpen(false);
          setSelectedLabel(null);
        }}
        onAdd={handleSaveCollections}
        collections={collections}
        labelId={selectedLabel?.id || ''}
        existingCollectionIds={selectedLabelCollections.map(c => c.collectionId || '').filter(Boolean)}
      />
    </div>
  );
};

export default NavigationPage;
