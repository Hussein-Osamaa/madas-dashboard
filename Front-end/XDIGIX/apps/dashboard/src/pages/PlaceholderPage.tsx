import { useTheme } from '../contexts/ThemeContext';

type Props = { title: string };

export default function PlaceholderPage({ title }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>{title}</h1>
      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Content for this section is coming soon.</p>
    </>
  );
}
