import { useTheme } from '../contexts/ThemeContext';
import { User, Building2, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const accent = isDark ? 'text-yellow-400' : 'text-sky-800';

  const sections = [
    { title: 'Profile', description: 'Name, email, and account details', icon: User },
    { title: 'Business', description: 'Brand and workspace settings', icon: Building2 },
    { title: 'Notifications', description: 'Email and in-app alerts', icon: Bell },
    { title: 'Security', description: 'Password and two-factor authentication', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${accent}`}>Settings</h1>
      <p className={textMuted}>Manage your account and workspace. More options coming soon.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div
            key={s.title}
            className={`rounded-2xl border ${cardBg} p-6 flex items-start gap-4`}
          >
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <s.icon className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-sky-600'}`} />
            </div>
            <div>
              <h2 className={`font-semibold ${textPrimary}`}>{s.title}</h2>
              <p className={`text-sm mt-1 ${textMuted}`}>{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
