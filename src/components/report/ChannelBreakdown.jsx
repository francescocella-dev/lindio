function getMax(items) {
  return Math.max(...items.map((item) => item.value), 1);
}

export default function ChannelBreakdown({ title, subtitle, items }) {
  const max = getMax(items);

  return (
    <section className="breakdown-card">
      <div className="section-title-row">
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="breakdown-list">
        {items.map((item) => {
          const width = Math.max(8, Math.round((item.value / max) * 100));

          return (
            <div className="breakdown-item" key={item.label}>
              <div className="breakdown-label-row">
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </div>

              <div className="breakdown-bar">
                <i style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}