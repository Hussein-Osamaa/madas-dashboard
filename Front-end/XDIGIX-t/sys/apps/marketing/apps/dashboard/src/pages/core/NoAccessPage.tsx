import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NoAccessPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6">
      <div className="max-w-xl bg-white shadow-card border border-gray-100 rounded-2xl px-10 py-12 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl font-bold">
          !
        </div>
        <h1 className="text-3xl font-semibold text-primary">Access Restricted</h1>
        <p className="text-madas-text/70 leading-relaxed">
          We couldn&apos;t find a business workspace linked to your account. Please contact your administrator to gain
          access or request an invite.
        </p>
        <div className="space-y-3 text-sm text-madas-text/60">
          <p>
            Need help? Email{' '}
            <a className="text-primary font-medium" href="mailto:support@madas.app">
              support@madas.app
            </a>
          </p>
          <p>
            Tried logging into the wrong account?{' '}
            <button 
              onClick={handleSignOut}
              className="text-primary font-medium hover:underline"
            >
              Sign in again
            </button>
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;

