export default function EmptyState({ message, action }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
      <p style={{ marginBottom: action ? '1rem' : 0 }}>{message}</p>
      {action}
    </div>
  );
}
