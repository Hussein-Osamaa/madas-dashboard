import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { useSiteSections } from '../../hooks/useSiteSections';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import NavbarSection from '../../components/builder/sections/NavbarSection';
import FooterSection from '../../components/builder/sections/FooterSection';

const CartPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const { settings, loading, businessId } = useWebsiteSettings(siteId, null);
  const { navbarSection, footerSection, loading: sectionsLoading } = useSiteSections(siteId, businessId);

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${siteId}`);
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }
  }, [siteId]);

  if (loading || sectionsLoading) {
    return <FullScreenLoader message="Loading cart..." />;
  }

  const primaryColor = settings.theme.primaryColor;
  const secondaryColor = settings.theme.secondaryColor;
  const backgroundColor = settings.theme.backgroundColor;
  const textColor = settings.theme.textColor;

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotal = total;
  const shipping = 0;
  const tax = total * 0.1; // 10% tax
  const finalTotal = subtotal + shipping + tax;

  const updateQuantity = (id: string, quantity: number) => {
    const updated = cartItems.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
    );
    setCartItems(updated);
    localStorage.setItem(`cart_${siteId}`, JSON.stringify(updated));
  };

  const removeItem = (id: string) => {
    if (confirm('Remove this item from cart?')) {
      const updated = cartItems.filter(item => item.id !== id);
      setCartItems(updated);
      localStorage.setItem(`cart_${siteId}`, JSON.stringify(updated));
    }
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .cart-item {
          animation: slideIn 0.4s ease-out;
        }
        .quantity-btn {
          transition: all 0.2s ease;
        }
        .quantity-btn:hover {
          transform: scale(1.1);
          background-color: ${primaryColor}20;
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
          <h1 style={{ 
            fontSize: 'clamp(2rem, 5vw, 3rem)', 
            fontWeight: '800', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Shopping Cart
          </h1>
          <p style={{ 
            marginTop: '0.75rem', 
            fontSize: '1.125rem',
            opacity: 0.95,
            fontWeight: '300'
          }}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
      </header>

      {/* Cart Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 1rem' }}>
        {cartItems.length === 0 ? (
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
                shopping_cart
              </span>
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: textColor,
              marginBottom: '0.5rem'
            }}>
              Your cart is empty
            </h2>
            <p style={{ 
              fontSize: '1.125rem', 
              color: textColor, 
              opacity: 0.6,
              marginBottom: '2rem'
            }}>
              Start adding items to your cart
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
              Continue Shopping
            </a>
          </div>
        ) : (
          <>
            <style>{`
              @media (min-width: 1024px) {
                .cart-layout {
                  grid-template-columns: 1fr 400px !important;
                }
              }
            `}</style>
            <div className="cart-layout" style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '3rem',
              width: '100%'
            }}>
              {/* Cart Items */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className="cart-item"
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    padding: '2rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div style={{
                    width: '140px',
                    height: '140px',
                    background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <span className="material-icons" style={{ 
                        fontSize: '3.5rem', 
                        color: primaryColor, 
                        opacity: 0.3 
                      }}>
                        image
                      </span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.75rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.375rem',
                        fontWeight: '700',
                        margin: 0,
                        color: primaryColor,
                        lineHeight: '1.3'
                      }}>
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#fecaca';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '18px' }}>
                          close
                        </span>
                      </button>
                    </div>
                    
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '800',
                      color: primaryColor,
                      marginBottom: '1.5rem',
                      letterSpacing: '-0.02em'
                    }}>
                      ${item.price?.toFixed(2) || '0.00'}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        padding: '0.5rem',
                        background: `${primaryColor}08`,
                        borderRadius: '12px'
                      }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="quantity-btn"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: `2px solid ${primaryColor}40`,
                            backgroundColor: 'transparent',
                            color: primaryColor,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700'
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '20px' }}>remove</span>
                        </button>
                        <span style={{ 
                          minWidth: '50px', 
                          textAlign: 'center', 
                          fontWeight: '700',
                          fontSize: '1.125rem',
                          color: textColor
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="quantity-btn"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: `2px solid ${primaryColor}40`,
                            backgroundColor: 'transparent',
                            color: primaryColor,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700'
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '20px' }}>add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    textAlign: 'right',
                    minWidth: '120px'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '800',
                      color: primaryColor,
                      letterSpacing: '-0.02em'
                    }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: textColor,
                      opacity: 0.6,
                      marginTop: '0.25rem'
                    }}>
                      ${item.price?.toFixed(2)} each
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Order Summary Card */}
              <div style={{
                position: 'sticky',
                top: '2rem',
                padding: '2.5rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.05)',
                height: 'fit-content',
                maxWidth: '100%'
              }}>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                marginBottom: '2rem',
                color: primaryColor,
                letterSpacing: '-0.02em'
              }}>
                Order Summary
              </h2>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <span style={{ 
                    color: textColor, 
                    opacity: 0.7,
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    Subtotal
                  </span>
                  <span style={{ 
                    fontWeight: '700', 
                    color: textColor,
                    fontSize: '1.125rem'
                  }}>
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <span style={{ 
                    color: textColor, 
                    opacity: 0.7,
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    Shipping
                  </span>
                  <span style={{ 
                    fontWeight: '700', 
                    color: '#10b981',
                    fontSize: '1.125rem'
                  }}>
                    Free
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <span style={{ 
                    color: textColor, 
                    opacity: 0.7,
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    Tax
                  </span>
                  <span style={{ 
                    fontWeight: '700', 
                    color: textColor,
                    fontSize: '1.125rem'
                  }}>
                    ${tax.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1.5rem',
                marginBottom: '2rem',
                paddingTop: '1.5rem',
                borderTop: `3px solid ${primaryColor}`
              }}>
                <span style={{ 
                  fontSize: '1.375rem', 
                  fontWeight: '800', 
                  color: primaryColor,
                  letterSpacing: '-0.02em'
                }}>
                  Total
                </span>
                <span style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: '800', 
                  color: primaryColor,
                  letterSpacing: '-0.02em'
                }}>
                  ${finalTotal.toFixed(2)}
                </span>
              </div>
              
              <button
                style={{
                  width: '100%',
                  padding: '1.125rem',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: `0 8px 24px ${primaryColor}40`,
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 12px 32px ${primaryColor}50`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${primaryColor}40`;
                }}
              >
                <span className="material-icons" style={{ fontSize: '22px' }}>
                  lock
                </span>
                Proceed to Checkout
              </button>
              
              <a
                href={`/site/${siteId}/products`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.875rem',
                  textAlign: 'center',
                  color: primaryColor,
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '600',
                  borderRadius: '12px',
                  border: `2px solid ${primaryColor}40`,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = `${primaryColor}08`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Continue Shopping
              </a>
              </div>
            </div>
          </>
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

export default CartPage;
