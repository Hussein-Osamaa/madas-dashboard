export default function Loading({ message = 'Loading…' }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
      {message}
    </div>
  );
}
