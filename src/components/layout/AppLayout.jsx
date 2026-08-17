import { Suspense } from "react";
import { Link, Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";
import Topbar from "./Topbar.jsx";
import RouteLoadingFallback from "./RouteLoadingFallback.jsx";

function isProfileComplete(profile, organization) {
  return Boolean(
    profile?.fullName?.trim() &&
      organization?.name?.trim() &&
      organization?.sector?.trim() &&
      organization?.city?.trim()
  );
}

function CompleteProfileModal() {
  return (
    <div className="profile-required-overlay" role="dialog" aria-modal="true">
      <section className="profile-required-card">
        <div className="profile-required-icon">
          <img src="/brand/lindio-icon.png" alt="" />
        </div>

        <span>Prima configurazione</span>
        <h2>Completa il profilo aziendale</h2>
        <p>
          Prima di usare Lindio inserisci i dati principali dell’azienda e dell’utente. Servono
          per personalizzare dashboard, richieste e promemoria.
        </p>

        <Link className="button button-primary" to="/settings">
          Completa profilo
        </Link>
      </section>
    </div>
  );
}

export default function AppLayout() {
  const context = useOutletContext();
  const location = useLocation();

  if (!context.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const profileIncomplete = !isProfileComplete(context.profile, context.organization);
  const isSettingsPage = location.pathname === "/settings";

  return (
    <div className="app-shell">
      <Sidebar profile={context.profile} organization={context.organization} />

      <main className="app-main">
        <Topbar
          profile={context.profile}
          organization={context.organization}
          logout={context.logout}
          isDemoMode={context.isDemoMode}
        />
        <Suspense fallback={<RouteLoadingFallback compact />}>
          <Outlet context={context} />
        </Suspense>
      </main>

      <MobileBottomNav />

      {profileIncomplete && !isSettingsPage && <CompleteProfileModal />}
    </div>
  );
}
