import { NavLink } from "react-router-dom";
import { mobileNavigation } from "../../app/config/navigation.js";

export default function MobileBottomNav() {
  return (
    <nav className="bottom-nav">
      {mobileNavigation.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `${isActive ? "active" : ""} ${item.isPrimary ? "add" : ""}`.trim()}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
