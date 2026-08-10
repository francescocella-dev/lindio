import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

export default function ResetPasswordPage() {
  const { isLoggedIn, completePasswordRecovery } = useOutletContext();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("La nuova password deve avere almeno 8 caratteri.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Le due password non coincidono.");
      return;
    }

    setIsSubmitting(true);

    try {
      await completePasswordRecovery(password);
      setPassword("");
      setConfirmPassword("");
      setMessage("Password aggiornata correttamente.");
    } catch (updateError) {
      setError(updateError.message || "Non è stato possibile aggiornare la password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Sicurezza"
      title="Scegli una nuova password"
      description="Il cambio password richiede una sessione valida creata dal link di recupero Supabase."
    >
      {!isLoggedIn ? (
        <div className="login-warning">
          Il link di recupero non ha creato una sessione valida oppure è scaduto. Richiedi un nuovo link.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Input
            label="Nuova password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Almeno 8 caratteri"
            autoComplete="new-password"
            required
          />

          <Input
            label="Conferma nuova password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Ripeti la password"
            autoComplete="new-password"
            required
          />

          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-success">{message}</div>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Aggiornamento..." : "Aggiorna password"}
          </Button>
        </form>
      )}

      <div className="auth-footer-link">
        {isLoggedIn ? <Link to="/today">Vai a Lindio</Link> : <Link to="/forgot-password">Richiedi un nuovo link</Link>}
      </div>
    </AuthShell>
  );
}
