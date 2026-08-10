import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

export default function ForgotPasswordPage() {
  const { sendPasswordReset, isSupabaseConfigured } = useOutletContext();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setMessage(
        "Se l'indirizzo può ricevere un recupero password, troverai un messaggio con il link per scegliere una nuova password."
      );
    } catch (requestError) {
      setError(requestError.message || "Non è stato possibile inviare la richiesta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Recupero account"
      title="Reimposta la password"
      description="Inserisci l'email di accesso. Il link di recupero riporterà a Lindio per scegliere una nuova password."
    >
      {!isSupabaseConfigured && (
        <div className="login-warning">Recupero password non disponibile: Supabase non è configurato.</div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Email"
          autoComplete="email"
          required
        />

        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-success">{message}</div>}

        <Button type="submit" disabled={isSubmitting || !isSupabaseConfigured}>
          {isSubmitting ? "Invio..." : "Invia link di recupero"}
        </Button>
      </form>

      <div className="auth-footer-link">
        <Link to="/login">Torna all'accesso</Link>
      </div>
    </AuthShell>
  );
}
