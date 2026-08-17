export default function RouteLoadingFallback({ compact = false }) {
  return (
    <section
      className={compact ? "page" : "app-loading-page"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loading-card">
        <img className="app-loading-logo" src="/brand/lindio-logo.png" alt="Lindio" />
        <div className="app-loading-spinner" aria-hidden="true" />
        <div className="app-loading-copy">
          <strong>Caricamento schermata</strong>
          <span>Stiamo aprendo il modulo richiesto.</span>
        </div>
      </div>
    </section>
  );
}
