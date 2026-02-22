import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import { useSiteSections } from '../../hooks/useSiteSections';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import NavbarSection from '../../components/builder/sections/NavbarSection';
import FooterSection from '../../components/builder/sections/FooterSection';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  orderHistory?: Array<{
    id: string;
    date: string;
    total: number;
    status: string;
    items: number;
  }>;
  createdAt?: string;
}

const ProfilePage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'settings'>('profile');
  const { settings, loading, businessId } = useWebsiteSettings(siteId, null);
  const { navbarSection, footerSection, loading: sectionsLoading } = useSiteSections(siteId, businessId);

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem(`user_${siteId}`);
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setEditForm(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, [siteId]);

  if (loading || sectionsLoading) {
    return <FullScreenLoader message="Loading profile..." />;
  }

  const theme = settings?.theme;
  const primaryColor = theme?.primaryColor ?? '#27491F';
  const secondaryColor = theme?.secondaryColor ?? '#4a7c59';
  const backgroundColor = theme?.backgroundColor ?? '#ffffff';
  const textColor = theme?.textColor ?? '#1a1a1a';

  const handleLogout = () => {
    localStorage.removeItem(`user_${siteId}`);
    localStorage.removeItem(`auth_${siteId}`);
    navigate(`/site/${siteId}/login`);
  };

  const handleSaveProfile = () => {
    if (user && editForm) {
      const updatedUser = { ...user, ...editForm };
      setUser(updatedUser);
      localStorage.setItem(`user_${siteId}`, JSON.stringify(updatedUser));
      setIsEditing(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  // If no user is logged in
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: backgroundColor,
        color: textColor,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {navbarSection && (
          <NavbarSection 
            data={navbarSection.data as any} 
            style={navbarSection.style as any} 
            siteId={siteId}
          />
        )}

        <main style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem 1rem'
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            background: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 2rem',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '3rem', 
                color: primaryColor, 
                opacity: 0.6 
              }}>
                account_circle
              </span>
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: textColor,
              marginBottom: '0.75rem'
            }}>
              Sign In Required
            </h2>
            <p style={{ 
              fontSize: '1rem', 
              color: textColor, 
              opacity: 0.6,
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              Please sign in to view your profile, orders, and account settings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <a
                href={`/site/${siteId}/login`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 2rem',
                  backgroundColor: primaryColor,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  boxShadow: `0 4px 16px ${primaryColor}40`,
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>login</span>
                Sign In
              </a>
              <a
                href={`/site/${siteId}/register`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 2rem',
                  backgroundColor: 'transparent',
                  color: primaryColor,
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: `2px solid ${primaryColor}40`,
                  transition: 'all 0.2s'
                }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>person_add</span>
                Create Account
              </a>
            </div>
          </div>
        </main>

        {footerSection && (
          <FooterSection 
            data={footerSection.data as any} 
            style={footerSection.style as any}
            siteId={siteId}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: backgroundColor,
      color: textColor,
      display: 'flex',
      flexDirection: 'column'
    }}>
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-card {
          animation: fadeIn 0.4s ease-out;
        }
        .tab-btn {
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          background-color: ${primaryColor}10;
        }
        .tab-btn.active {
          background-color: ${primaryColor};
          color: white;
        }
        .input-field {
          transition: all 0.2s ease;
          border: 2px solid #e5e7eb;
        }
        .input-field:focus {
          border-color: ${primaryColor};
          outline: none;
          box-shadow: 0 0 0 3px ${primaryColor}20;
        }
        @media (min-width: 1024px) {
          .profile-layout {
            grid-template-columns: 280px 1fr !important;
          }
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
          background: `radial-gradient(circle at 80% 50%, ${secondaryColor}30 0%, transparent 50%)`,
          pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '3px solid rgba(255,255,255,0.3)'
          }}>
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span className="material-icons" style={{ fontSize: '3.5rem', opacity: 0.9 }}>
                person
              </span>
            )}
          </div>
          <h1 style={{ 
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
            fontWeight: '800', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            {user.name || 'My Profile'}
          </h1>
          <p style={{ 
            marginTop: '0.5rem', 
            fontSize: '1rem',
            opacity: 0.9,
            fontWeight: '300'
          }}>
            {user.email}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', width: '100%' }}>
        <div className="profile-layout" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem'
        }}>
          {/* Sidebar / Tabs */}
          <div className="profile-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            height: 'fit-content'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { id: 'profile', label: 'My Profile', icon: 'person' },
                { id: 'orders', label: 'Order History', icon: 'receipt_long' },
                { id: 'settings', label: 'Settings', icon: 'settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    border: 'none',
                    borderRadius: '12px',
                    background: activeTab === tab.id ? primaryColor : 'transparent',
                    color: activeTab === tab.id ? '#FFFFFF' : textColor,
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '20px' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
              
              <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.5rem 0' }} />
              
              <button
                onClick={handleLogout}
                className="tab-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>logout</span>
                Sign Out
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="profile-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            animationDelay: '0.1s'
          }}>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '2rem'
                }}>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: primaryColor,
                    margin: 0
                  }}>
                    Personal Information
                  </h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        backgroundColor: `${primaryColor}10`,
                        color: primaryColor,
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '18px' }}>edit</span>
                      Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditForm(user);
                        }}
                        style={{
                          padding: '0.75rem 1.25rem',
                          backgroundColor: '#f3f4f6',
                          color: textColor,
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1.25rem',
                          backgroundColor: primaryColor,
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem'
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: '18px' }}>check</span>
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      color: textColor,
                      opacity: 0.7,
                      marginBottom: '0.5rem'
                    }}>
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="input-field"
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          borderRadius: '10px',
                          fontSize: '1rem'
                        }}
                      />
                    ) : (
                      <p style={{ fontSize: '1.125rem', fontWeight: '500', margin: 0 }}>
                        {user.name || '-'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      color: textColor,
                      opacity: 0.7,
                      marginBottom: '0.5rem'
                    }}>
                      Email Address
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="input-field"
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          borderRadius: '10px',
                          fontSize: '1rem'
                        }}
                      />
                    ) : (
                      <p style={{ fontSize: '1.125rem', fontWeight: '500', margin: 0 }}>
                        {user.email || '-'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '600',
                      color: textColor,
                      opacity: 0.7,
                      marginBottom: '0.5rem'
                    }}>
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="input-field"
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          borderRadius: '10px',
                          fontSize: '1rem'
                        }}
                      />
                    ) : (
                      <p style={{ fontSize: '1.125rem', fontWeight: '500', margin: 0 }}>
                        {user.phone || '-'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '700', 
                    color: primaryColor,
                    marginBottom: '1.5rem'
                  }}>
                    Shipping Address
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: textColor,
                        opacity: 0.7,
                        marginBottom: '0.5rem'
                      }}>
                        Street Address
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.address?.street || ''}
                          onChange={(e) => handleAddressChange('street', e.target.value)}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            fontSize: '1rem'
                          }}
                        />
                      ) : (
                        <p style={{ fontSize: '1rem', margin: 0 }}>
                          {user.address?.street || '-'}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: textColor,
                        opacity: 0.7,
                        marginBottom: '0.5rem'
                      }}>
                        City
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.address?.city || ''}
                          onChange={(e) => handleAddressChange('city', e.target.value)}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            fontSize: '1rem'
                          }}
                        />
                      ) : (
                        <p style={{ fontSize: '1rem', margin: 0 }}>
                          {user.address?.city || '-'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: textColor,
                        opacity: 0.7,
                        marginBottom: '0.5rem'
                      }}>
                        State / Province
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.address?.state || ''}
                          onChange={(e) => handleAddressChange('state', e.target.value)}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            fontSize: '1rem'
                          }}
                        />
                      ) : (
                        <p style={{ fontSize: '1rem', margin: 0 }}>
                          {user.address?.state || '-'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: textColor,
                        opacity: 0.7,
                        marginBottom: '0.5rem'
                      }}>
                        ZIP / Postal Code
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.address?.zipCode || ''}
                          onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            fontSize: '1rem'
                          }}
                        />
                      ) : (
                        <p style={{ fontSize: '1rem', margin: 0 }}>
                          {user.address?.zipCode || '-'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: textColor,
                        opacity: 0.7,
                        marginBottom: '0.5rem'
                      }}>
                        Country
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.address?.country || ''}
                          onChange={(e) => handleAddressChange('country', e.target.value)}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            borderRadius: '10px',
                            fontSize: '1rem'
                          }}
                        />
                      ) : (
                        <p style={{ fontSize: '1rem', margin: 0 }}>
                          {user.address?.country || '-'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: primaryColor,
                  marginBottom: '2rem'
                }}>
                  Order History
                </h2>

                {(!user.orderHistory || user.orderHistory.length === 0) ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '4rem 1rem',
                    background: `${primaryColor}05`,
                    borderRadius: '16px',
                    border: `2px dashed ${primaryColor}20`
                  }}>
                    <span className="material-icons" style={{ 
                      fontSize: '4rem', 
                      color: primaryColor, 
                      opacity: 0.3,
                      marginBottom: '1rem',
                      display: 'block'
                    }}>
                      receipt_long
                    </span>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: textColor,
                      marginBottom: '0.5rem'
                    }}>
                      No Orders Yet
                    </h3>
                    <p style={{ 
                      fontSize: '0.9375rem', 
                      color: textColor, 
                      opacity: 0.6,
                      marginBottom: '1.5rem'
                    }}>
                      Your order history will appear here
                    </p>
                    <a
                      href={`/site/${siteId}/products`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.875rem 1.5rem',
                        backgroundColor: primaryColor,
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.9375rem'
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '18px' }}>shopping_bag</span>
                      Start Shopping
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {user.orderHistory.map((order) => (
                      <div
                        key={order.id}
                        style={{
                          padding: '1.5rem',
                          background: '#f9fafb',
                          borderRadius: '14px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <p style={{ 
                              fontSize: '0.875rem', 
                              color: textColor, 
                              opacity: 0.6,
                              marginBottom: '0.25rem'
                            }}>
                              Order #{order.id}
                            </p>
                            <p style={{ 
                              fontSize: '0.9375rem', 
                              fontWeight: '600',
                              margin: 0
                            }}>
                              {order.date}
                            </p>
                          </div>
                          <span style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: order.status === 'Delivered' ? '#dcfce7' : 
                                           order.status === 'Shipped' ? '#dbeafe' : '#fef3c7',
                            color: order.status === 'Delivered' ? '#16a34a' : 
                                   order.status === 'Shipped' ? '#2563eb' : '#d97706',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {order.status}
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <p style={{ 
                            fontSize: '0.9375rem', 
                            color: textColor, 
                            opacity: 0.7,
                            margin: 0
                          }}>
                            {order.items} {order.items === 1 ? 'item' : 'items'}
                          </p>
                          <p style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '700',
                            color: primaryColor,
                            margin: 0
                          }}>
                            ${order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: primaryColor,
                  marginBottom: '2rem'
                }}>
                  Account Settings
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Notifications */}
                  <div style={{
                    padding: '1.5rem',
                    background: '#f9fafb',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          backgroundColor: `${primaryColor}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span className="material-icons" style={{ color: primaryColor }}>notifications</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '600', margin: 0, marginBottom: '0.25rem' }}>
                            Email Notifications
                          </p>
                          <p style={{ fontSize: '0.875rem', color: textColor, opacity: 0.6, margin: 0 }}>
                            Receive updates about orders and promotions
                          </p>
                        </div>
                      </div>
                      <label style={{ 
                        position: 'relative', 
                        display: 'inline-block',
                        width: '50px',
                        height: '28px'
                      }}>
                        <input 
                          type="checkbox" 
                          defaultChecked
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: primaryColor,
                          borderRadius: '14px',
                          transition: '0.3s'
                        }}>
                          <span style={{
                            position: 'absolute',
                            height: '22px',
                            width: '22px',
                            left: '25px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }} />
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Password */}
                  <div style={{
                    padding: '1.5rem',
                    background: '#f9fafb',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          backgroundColor: `${primaryColor}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span className="material-icons" style={{ color: primaryColor }}>lock</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '600', margin: 0, marginBottom: '0.25rem' }}>
                            Change Password
                          </p>
                          <p style={{ fontSize: '0.875rem', color: textColor, opacity: 0.6, margin: 0 }}>
                            Update your account password
                          </p>
                        </div>
                      </div>
                      <button style={{
                        padding: '0.625rem 1rem',
                        backgroundColor: `${primaryColor}10`,
                        color: primaryColor,
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Delete Account */}
                  <div style={{
                    padding: '1.5rem',
                    background: '#fef2f2',
                    borderRadius: '14px',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          backgroundColor: '#fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span className="material-icons" style={{ color: '#dc2626' }}>delete_forever</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: '600', margin: 0, marginBottom: '0.25rem', color: '#dc2626' }}>
                            Delete Account
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#991b1b', opacity: 0.8, margin: 0 }}>
                            Permanently delete your account and data
                          </p>
                        </div>
                      </div>
                      <button style={{
                        padding: '0.625rem 1rem',
                        backgroundColor: '#dc2626',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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

export default ProfilePage;
