import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">Control Center</h1>
      <p className="text-gray-400 mb-6">Welcome, {user?.name || user?.email}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Clients', value: '—', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/20', to: 'clients' },
          { label: 'Users', value: '—', color: 'bg-white/5 text-gray-300 border border-white/10', to: 'client-users' },
          { label: 'Orders', value: '—', color: 'bg-white/5 text-gray-300 border border-white/10', to: 'fulfillment' },
        ].map(({ label, value, color, to }) => (
          <Link key={label} to={to} className={`p-4 rounded-xl ${color} block hover:opacity-90`}>
            <div className="text-sm opacity-90">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
