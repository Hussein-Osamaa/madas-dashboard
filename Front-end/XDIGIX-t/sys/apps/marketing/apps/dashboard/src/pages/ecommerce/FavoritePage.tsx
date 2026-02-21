import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { useSiteSections } from '../../hooks/useSiteSections';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import NavbarSection from '../../components/builder/sections/NavbarSection';
import FooterSection from '../../components/builder/sections/FooterSection';

const FavoritePage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [favorites, setFavorites] = useState<any[]>([]);
  const { settings, loading, businessId } = useWebsiteSettings(siteId, null);
  const { navbarSection, footerSection, loading: sectionsLoading } = useSiteSections(siteId, businessId);

  useEffect(() => {
    const savedFavorites = localStorage.getItem(`favorites_${siteId}`);
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error parsing favorites:', e);
      }
    }
  }, [siteId]);

  if (loading || sectionsLoading) {
    return <FullScreenLoader message="Loading favorites..." />;
  }

  const primaryColor = settings.theme.primaryColor;
  const secondaryColor = settings.theme.secondaryColor;
  const backgroundColor = settings.theme.backgroundColor;
  const textColor = settings.theme.textColor;

  const removeFavorite = (id: string) => {
    if (confirm('Remove from favorites?')) {
      const updated = favorites.filter(item => item.id !== id);
      setFavorites(updated);
      localStorage.setItem(`favorites_${siteId}`, JSON.stringify(updated));
    }
  };

  const addToCart = (item: any) => {
    if (!siteId) return;
    const cart = JSON.parse(localStorage.getItem(`cart_${siteId}`) || '[]');
    const existingItem = cart.find((cartItem: any) => cartItem.id === item.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }
    
    localStorage.setItem(`cart_${siteId}`, JSON.stringify(cart));
    alert('Added to cart!');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: backgroundColor,
      color: textColor,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navbar */}
      {navbarSection && (
        <NavbarSection 
          data={navbarSection.data as any} 
          style={navbarSection.style as any} 
          siteId={siteId}
        />
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
        .favorite-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeIn 0.5s ease-out;
        }
        .favorite-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .favorite-card:hover .product-image {
          transform: scale(1.1);
        }
        .product-image {
          transition: transform 0.5s ease;
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        color: '#FFFFFF',
        padding: '3rem 1rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, ${secondaryColor}30 0%, transparent 50%)`,
          pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="material-icons" style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            opacity: 0.9
          }}>
            favorite
          </span>
          <h1 style={{ 
            fontSize: 'clamp(2rem, 5vw, 3rem)', 
            fontWeight: '800', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            My Favorites
          </h1>
          <p style={{ 
            marginTop: '0.75rem', 
            fontSize: '1.125rem',
            opacity: 0.95,
            fontWeight: '300'
          }}>
            {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
      </header>

      {/* Favorites Grid */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '4rem 1rem' }}>
        {favorites.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '6rem 1rem',
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            borderRadius: '24px',
            border: `2px dashed ${primaryColor}40`
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 2rem',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '4rem', 
                color: primaryColor, 
                opacity: 0.5 
              }}>
                favorite_border
              </span>
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: textColor,
              marginBottom: '0.5rem'
            }}>
              No Favorites Yet
            </h2>
            <p style={{ 
              fontSize: '1.125rem', 
              color: textColor, 
              opacity: 0.6,
              marginBottom: '2rem'
            }}>
              Start saving your favorite products
            </p>
            <a
              href={`/site/${siteId}/products`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2.5rem',
                backgroundColor: primaryColor,
                color: '#FFFFFF',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1.125rem',
                boxShadow: `0 4px 16px ${primaryColor}40`,
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span className="material-icons" style={{ fontSize: '20px' }}>shopping_bag</span>
              Browse Products
            </a>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '2rem',
            paddingBottom: '2rem'
          }}>
            {favorites.map((item, index) => (
              <div
                key={item.id}
                className="favorite-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  position: 'relative',
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Remove Button */}
                <button
                  onClick={() => removeFavorite(item.id)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
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
                    zIndex: 10,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span className="material-icons" style={{ 
                    fontSize: '24px', 
                    color: '#ef4444'
                  }}>
                    favorite
                  </span>
                </button>

                {/* Product Image */}
                <div style={{
                  height: '280px',
                  background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="product-image"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span className="material-icons" style={{ 
                      fontSize: '5rem', 
                      color: primaryColor, 
                      opacity: 0.2 
                    }}>
                      image
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div style={{ padding: '1.75rem' }}>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: primaryColor,
                    lineHeight: '1.3'
                  }}>
                    {item.name || 'Product'}
                  </h3>
                  
                  {item.description && (
                    <p style={{
                      fontSize: '0.9375rem',
                      color: textColor,
                      opacity: 0.7,
                      marginBottom: '1.25rem',
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.description}
                    </p>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1.25rem'
                  }}>
                    <span style={{
                      fontSize: '1.75rem',
                      fontWeight: '800',
                      color: primaryColor,
                      letterSpacing: '-0.02em'
                    }}>
                      ${item.price || '0.00'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => addToCart(item)}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: `0 4px 12px ${primaryColor}30`,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 20px ${primaryColor}40`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${primaryColor}30`;
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
        )}
      </main>

      {/* Footer */}
      {footerSection && (
        <FooterSection 
          data={footerSection.data as any} 
          style={footerSection.style as any}
          siteId={siteId}
        />
      )}
    </div>
  );
};

export default FavoritePage;
