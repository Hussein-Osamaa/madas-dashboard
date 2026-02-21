import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';
import FullScreenLoader from '../../components/common/FullScreenLoader';

const LoginPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings, loading: settingsLoading } = useWebsiteSettings(siteId, null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // TODO: Implement actual login logic
    setTimeout(() => {
      setLoading(false);
      navigate(`/site/${siteId}`);
    }, 1000);
  };

  if (settingsLoading) {
    return <FullScreenLoader message="Loading..." />;
  }

  const primaryColor = settings.theme.primaryColor;
  const secondaryColor = settings.theme.secondaryColor;
  const backgroundColor = settings.theme.backgroundColor;
  const textColor = settings.theme.textColor;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${backgroundColor} 0%, ${primaryColor}08 100%)`,
      color: textColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        :root {
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .floating-shape {
          animation: float 6s ease-in-out infinite;
        }
        .login-card {
          animation: fadeIn 0.6s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-field:focus {
          border-color: ${primaryColor} !important;
          box-shadow: 0 0 0 4px ${primaryColor}15 !important;
        }
      `}</style>

      {/* Decorative Background Shapes */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}10 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} className="floating-shape" />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${secondaryColor}10 0%, transparent 70%)`,
        pointerEvents: 'none',
        animationDelay: '2s'
      }} className="floating-shape" />

      <div className="login-card" style={{
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid rgba(0,0,0,0.05)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo/Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 2rem',
          borderRadius: '20px',
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 24px ${primaryColor}30`
        }}>
          <span className="material-icons" style={{ 
            fontSize: '2.5rem', 
            color: '#FFFFFF' 
          }}>
            lock
          </span>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          marginBottom: '0.5rem',
          color: primaryColor,
          textAlign: 'center',
          letterSpacing: '-0.02em'
        }}>
          Welcome Back
        </h1>
        <p style={{
          textAlign: 'center',
          color: textColor,
          opacity: 0.7,
          marginBottom: '2.5rem',
          fontSize: '1rem'
        }}>
          Sign in to your account to continue
        </p>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid #fecaca'
          }}>
            <span className="material-icons" style={{ fontSize: '20px' }}>
              error_outline
            </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9375rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: textColor
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-icons" style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: textColor,
                opacity: 0.5,
                fontSize: '20px',
                pointerEvents: 'none'
              }}>
                email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 3rem',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s',
                  backgroundColor: '#f9fafb'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9375rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: textColor
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-icons" style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: textColor,
                opacity: 0.5,
                fontSize: '20px',
                pointerEvents: 'none'
              }}>
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 3rem',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s',
                  backgroundColor: '#f9fafb'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            fontSize: '0.9375rem'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              cursor: 'pointer',
              color: textColor,
              opacity: 0.8
            }}>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: primaryColor
                }}
              />
              <span>Remember me</span>
            </label>
            <a
              href="#"
              style={{
                color: primaryColor,
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              fontSize: '1.125rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s',
              boxShadow: `0 8px 24px ${primaryColor}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 12px 32px ${primaryColor}40`;
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${primaryColor}30`;
              }
            }}
          >
            {loading ? (
              <>
                <span className="material-icons" style={{ 
                  fontSize: '20px',
                  animation: 'spin 1s linear infinite'
                }}>
                  progress_activity
                </span>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                Signing in...
              </>
            ) : (
              <>
                <span className="material-icons" style={{ fontSize: '20px' }}>
                  login
                </span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '0.9375rem',
          color: textColor,
          opacity: 0.7
        }}>
          Don't have an account?{' '}
          <a
            href={`/site/${siteId}/register`}
            style={{
              color: primaryColor,
              textDecoration: 'none',
              fontWeight: '700',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
