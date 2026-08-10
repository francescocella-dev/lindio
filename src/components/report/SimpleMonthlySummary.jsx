export default function SimpleMonthlySummary({ report }) {
  return (
    <section className="monthly-summary-card">
      <div>
        <span>Riepilogo semplice</span>
        <h2>
          Hai registrato {report.total} {report.total === 1 ? "richiesta" : "richieste"}.
        </h2>
      </div>

      <p>
        Al momento risultano <strong>{report.won}</strong> vinte, <strong>{report.lost}</strong> perse e{" "}
        <strong>{report.open}</strong> ancora aperte. Il servizio più richiesto è{" "}
        <strong>{report.mostRequestedService}</strong>, mentre il canale più usato è{" "}
        <strong>{report.mostUsedChannel}</strong>.
      </p>

      <div className="summary-pill-row">
        <span>{report.followUps} follow-up</span>
        <span>{report.quotes} preventivi</span>
        <span>{report.newLeads} nuove/da rispondere</span>
      </div>
    </section>
  );
}