import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState.jsx";

export default function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <EmptyState title="Pagina non trovata" message="La rotta richiesta non esiste in Lindio." />
        <Link className="button button-primary" to="/today">
          Torna a Oggi
        </Link>
      </section>
    </main>
  );
}
