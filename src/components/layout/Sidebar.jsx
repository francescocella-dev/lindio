import { NavLink } from "react-router-dom";
import { primaryNavigation } from "../../app/config/navigation.js";

const ROLE_LABELS = {
  owner: "Titolare",
  admin: "Amministratore",
  manager: "Responsabile",
  operator: "Operatore",
  user: "Utente"
};

function getRoleLabel(role) {
  if (!role) return "Utente";

  const normalizedRole = String(role).trim().toLowerCase();

  if (ROLE_LABELS[normalizedRole]) {
    return ROLE_LABELS[normalizedRole];
  }

  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
}

export default function Sidebar({ profile }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand sidebar-brand-lindio">
        <div className="sidebar-brand-card">
          <img className="sidebar-brand-logo" src="/brand/lindio-logo.png" alt="Lindio" />
        </div>
      </div>

      <nav>
        {primaryNavigation.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? "active" : "")}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <span>{profile?.fullName || "Utente"}</span>
        <small>{getRoleLabel(profile?.role)}</small>
      </div>
    </aside>
  );
}