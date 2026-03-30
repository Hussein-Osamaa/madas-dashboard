import { memo } from 'react';

type Props = {
  data: Record<string, any>;
  style?: React.CSSProperties;
};

const SearchSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const title = d.title || 'Search';
  const placeholder = d.placeholder || 'Search products...';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  // Demo results for preview
  const demoProducts = [
    { name: 'Classic Leather Bag', price: 89.99 },
    { name: 'Minimalist Watch', price: 149.99 },
    { name: 'Wireless Headphones', price: 59.99 },
    { name: 'Designer Sunglasses', price: 124.99 },
  ];

  return (
    <section
      className="w-full"
      style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{title}</h1>
          <div className="max-w-xl mx-auto flex gap-2">
            <input
              type="search"
              placeholder={placeholder}
              className="flex-1 px-4 py-3 border rounded-lg text-sm bg-transparent outline-none transition-colors"
              style={{ borderColor: '#e5e7eb' }}
              readOnly
            />
            <button
              className="px-4 py-3 rounded-lg flex items-center gap-2"
              style={{ background: 'var(--c-primary, #121212)', color: '#fff', borderRadius: 'min(var(--btn-radius, 8px), 12px)' }}
            >
              <span className="material-icons" style={{ fontSize: '1.2rem' }}>search</span>
            </button>
          </div>
        </div>

        {/* Demo search results */}
        <p className="text-center text-sm mb-6" style={{ opacity: 0.5 }}>
          4 results for &quot;bag&quot;
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {demoProducts.map((p, i) => (
            <div key={i} className="group">
              <div className="aspect-square bg-gray-100 rounded-lg mb-2" />
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--c-primary)' }}>${p.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(SearchSection);
