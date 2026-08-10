export default function StatCard({ label, value, hint, tone = "blue" }) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      {hint && <p>{hint}</p>}
    </article>
  );
}