import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, db, getDocs } from '../../lib/firebase';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { useSiteSections } from '../../hooks/useSiteSections';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import NavbarSection from '../../components/builder/sections/NavbarSection';
import FooterSection from '../../components/builder/sections/FooterSection';

const LAST_STOCK_THRESHOLD = 3;

const getTotalStock = (product: any): number => {
  const stockByLocation = product?.stockByLocation;
  const stockVariants = product?.stock;

  if (stockByLocation && typeof stockByLocation === 'object') {
    return Object.values(stockByLocation).reduce(
      (sum: number, value: any) => sum + Number(value ?? 0),
      0
    );
  }

  if (stockVariants && typeof stockVariants === 'object') {
    return Object.values(stockVariants).reduce(
      (sum: number, value: any) => sum + Number(value ?? 0),
      0
    );
  }

  const numericStock = Number(stockVariants ?? stockByLocation ?? 0);
  return Number.isFinite(numericStock) ? numericStock : 0;
};

const LastPiecesPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, businessId } = useWebsiteSettings(siteId, null);
  const { navbarSection, footerSection, loading: sectionsLoading } = useSiteSections(siteId, businessId);

  useEffect(() => {
    const loadProducts = async () => {
      if (!siteId || !businessId) {
        setLoading(false);
        return;
      }

      try {
        const productsRef = collection(db, 'businesses', businessId, 'products');
        const productsSnapshot = await getDocs(productsRef);
        const productsData = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
      } catch (error) {
        console.error('[LastPiecesPage] Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [siteId, businessId]);

  const derivedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        totalStock: getTotalStock(product)
      })),
    [products]
  );

  const lastPieces = useMemo(
    () => derivedProducts.filter((product) => product.totalStock > 0 && product.totalStock <= LAST_STOCK_THRESHOLD),
    [derivedProducts]
  );

  if (loading || sectionsLoading) {
    return <FullScreenLoader message="Loading last pieces..." />;
  }

  const primaryColor = settings.theme.primaryColor;
  const secondaryColor = settings.theme.secondaryColor;
  const backgroundColor = settings.theme.backgroundColor;
  const textColor = settings.theme.textColor;

  const addToCart = (product: any) => {
    if (!siteId) return;
    const cart = JSON.parse(localStorage.getItem(`cart_${siteId}`) || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem(`cart_${siteId}`, JSON.stringify(cart));
    alert('Product added to cart!');
  };

  const addToFavorites = (product: any) => {
    if (!siteId) return;
    const favorites = JSON.parse(localStorage.getItem(`favorites_${siteId}`) || '[]');
    if (!favorites.find((item: any) => item.id === product.id)) {
      favorites.push(product);
      localStorage.setItem(`favorites_${siteId}`, JSON.stringify(favorites));
      alert('Added to favorites!');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: backgroundColor,
        color: textColor,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {navbarSection && (
        <NavbarSection data={navbarSection.data as any} style={navbarSection.style as any} siteId={siteId} />
      )}
      <style>{`
        :root {
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .product-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeIn 0.5s ease-out;
        }
        .product-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .product-image {
          transition: transform 0.5s ease;
        }
        .product-card:hover .product-image {
          transform: scale(1.1);
        }
        .btn-primary {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px ${primaryColor}40;
        }
      `}</style>

      <header
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
          color: '#FFFFFF',
          padding: '4rem 1rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 50%, ${secondaryColor}30 0%, transparent 50%)`,
            pointerEvents: 'none'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: '800',
              margin: 0,
              letterSpacing: '-0.02em',
              textShadow: '0 2px 20px rgba(0,0,0,0.2)'
            }}
          >
            Last Pieces
          </h1>
          <p
            style={{
              marginTop: '1rem',
              fontSize: '1.25rem',
              opacity: 0.95,
              fontWeight: '300'
            }}
          >
            Limited stock items that are almost gone — grab them before they sell out.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '4rem 1rem' }}>
        {lastPieces.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '6rem 1rem',
              background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
              borderRadius: '24px',
              border: `2px dashed ${primaryColor}40`
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 2rem',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span
                className="material-icons"
                style={{
                  fontSize: '4rem',
                  color: primaryColor,
                  opacity: 0.5
                }}
              >
                hourglass_empty
              </span>
            </div>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: textColor,
                marginBottom: '0.5rem'
              }}
            >
              No last pieces right now
            </h2>
            <p
              style={{
                fontSize: '1.125rem',
                color: textColor,
                opacity: 0.6,
                marginBottom: '2rem'
              }}
            >
              Check back soon — fresh stock might be added.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: textColor,
                    margin: 0
                  }}
                >
                  {lastPieces.length} {lastPieces.length === 1 ? 'item' : 'items'} left
                </h2>
                <p
                  style={{
                    margin: '0.25rem 0 0',
                    color: textColor,
                    opacity: 0.7,
                    fontSize: '0.95rem'
                  }}
                >
                  Showing products with {LAST_STOCK_THRESHOLD} or fewer units available.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '2rem',
                paddingBottom: '2rem'
              }}
            >
              {lastPieces.map((product, index) => (
                <div
                  key={product.id}
                  className="product-card"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div
                    style={{
                      height: '280px',
                      background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-image"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <span
                        className="material-icons"
                        style={{
                          fontSize: '5rem',
                          color: primaryColor,
                          opacity: 0.2
                        }}
                      >
                        image
                      </span>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        display: 'flex',
                        gap: '0.5rem',
                        opacity: 0,
                        transition: 'opacity 0.3s'
                      }}
                      className="product-actions"
                    >
                      <button
                        onClick={() => addToFavorites(product)}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span
                          className="material-icons"
                          style={{
                            fontSize: '20px',
                            color: secondaryColor
                          }}
                        >
                          favorite_border
                        </span>
                      </button>
                    </div>
                    <style>{`
                      .product-card:hover .product-actions {
                        opacity: 1 !important;
                      }
                    `}</style>
                  </div>

                  <div style={{ padding: '1.75rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '1.375rem',
                          fontWeight: '700',
                          margin: 0,
                          color: primaryColor,
                          lineHeight: '1.3',
                          flex: 1
                        }}
                      >
                        {product.name || 'Product'}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          backgroundColor: product.totalStock > 0 ? '#f59e0b20' : '#ef444420',
                          color: product.totalStock > 0 ? '#d97706' : '#ef4444',
                          whiteSpace: 'nowrap',
                          marginLeft: '0.5rem'
                        }}
                      >
                        {product.totalStock > 0 ? `${product.totalStock} left` : 'Out of stock'}
                      </span>
                    </div>

                    {product.description && (
                      <p
                        style={{
                          fontSize: '0.9375rem',
                          color: textColor,
                          opacity: 0.7,
                          marginBottom: '1.25rem',
                          lineHeight: '1.6',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {product.description}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.25rem'
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '0.875rem',
                            color: textColor,
                            opacity: 0.6,
                            textDecoration: 'line-through',
                            marginRight: '0.5rem'
                          }}
                        >
                          {product.compareAtPrice ? `$${product.compareAtPrice}` : ''}
                        </span>
                        <span
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: '800',
                            color: primaryColor,
                            letterSpacing: '-0.02em'
                          }}
                        >
                          ${product.price || '0.00'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        backgroundColor: primaryColor,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: `0 4px 12px ${primaryColor}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '20px' }}>
                        shopping_cart
                      </span>
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {footerSection && (
        <FooterSection data={footerSection.data as any} style={footerSection.style as any} siteId={siteId} />
      )}
    </div>
  );
};

export default LastPiecesPage;

