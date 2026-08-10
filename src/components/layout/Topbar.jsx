import { useState } from "react";
import LogoutConfirmModal from "../ui/LogoutConfirmModal.jsx";

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

export default function Topbar({ profile, organization, logout, isDemoMode = false }) {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleConfirmLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutOpen(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-mobile-company">
          <strong>{organization?.name || "Azienda"}</strong>
          <span>
            {organization?.city || "Città"} · {profile?.fullName || "Utente"}
          </span>
        </div>

        {isDemoMode && <span className="topbar-demo-badge">Demo locale</span>}

        <img className="topbar-mobile-logo" src="/brand/lindio-logo.png" alt="Lindio" />

        <button
          className="topbar-logout-button"
          type="button"
          onClick={() => setIsLogoutOpen(true)}
          aria-label={isDemoMode ? "Esci dalla demo" : "Esci"}
        >
          <PowerIcon />
        </button>
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutOpen}
        isLoading={isLoggingOut}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
