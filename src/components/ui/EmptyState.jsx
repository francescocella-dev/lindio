export default function EmptyState({ title, message, children }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {children && <div className="empty-state-actions">{children}</div>}
    </div>
  );
}