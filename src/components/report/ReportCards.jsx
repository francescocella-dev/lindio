export default function ReportCards({ cards }) {
  return (
    <section className="report-cards-grid">
      {cards.map((card) => (
        <article className={`report-card report-card-${card.tone || "blue"}`} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          {card.hint && <p>{card.hint}</p>}
        </article>
      ))}
    </section>
  );
}