import Button from "./Button.jsx";

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.75c.55 0 1 .45 1 1v8.1a1 1 0 1 1-2 0v-8.1c0-.55.45-1 1-1Zm5.36 3.42a1 1 0 0 1 1.41.06A9.03 9.03 0 0 1 21 12.15C21 17.04 16.97 21 12 21s-9-3.96-9-8.85c0-2.2.82-4.27 2.23-5.92a1 1 0 1 1 1.52 1.3A7.03 7.03 0 0 0 5 12.15C5 15.93 8.13 19 12 19s7-3.07 7-6.85c0-1.72-.64-3.34-1.7-4.62a1 1 0 0 1 .06-1.36Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" role="dialog" aria-modal="true">
      <section className="logout-modal-card">
        <div className="logout-modal-icon">
          <PowerIcon />
        </div>

        <span>Uscita account</span>

        <h2>Vuoi uscire da Lindio?</h2>

        <p>
          Chiuderai la sessione su questo dispositivo. Potrai accedere di nuovo con email e password.
        </p>

        <div className="logout-modal-actions">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Annulla
          </Button>

          <Button variant="danger" type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Uscita..." : "Esci"}
          </Button>
        </div>
      </section>
    </div>
  );
}