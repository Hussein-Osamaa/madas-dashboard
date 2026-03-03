import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function NoAccessPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
        <ShieldOff className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
      </div>
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No access</h1>
      <p className={`text-center max-w-md mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Your account is not linked to a brand, or you don’t have permission to view this workspace. Contact your administrator.
      </p>
      <Link
        to="/login"
        className={`px-4 py-2.5 rounded-xl font-medium ${isDark ? 'bg-yellow-600 text-white hover:bg-yellow-500' : 'bg-sky-600 text-white hover:bg-sky-500'}`}
      >
        Back to login
      </Link>
    </div>
  );
}
