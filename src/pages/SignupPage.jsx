import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

export default function SignupPage() {
  const { signup, authError, isSupabaseConfigured } = useOutletContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");
    setMessage("");

    if (password !== confirmPassword) {
      setLocalError("Le due password non coincidono.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signup({ fullName, email, password });

      if (!result.hasSession) {
        setMessage(
          "Account creato. Se la conferma email è attiva nel progetto Supabase, apri il link ricevuto e poi accedi."
        );
      }
    } catch (error) {
      setLocalError(error.message || "Registrazione non riuscita.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Nuovo workspace"
      title="Crea il tuo account"
      description="La registrazione crea solo l'identità. Al primo accesso configurerai l'azienda e diventerai owner del workspace."
    >
      {!isSupabaseConfigured && (
        <div className="login-warning">Registrazione non disponibile: Supabase non è configurato.</div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Nome e cognome"
          value={fullName}
          onChange={setFullName}
          placeholder="Nome operatore"
          autoComplete="name"
          required
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Email"
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Almeno 8 caratteri"
          autoComplete="new-password"
          required
        />

        <Input
          label="Conferma password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Ripeti la password"
          autoComplete="new-password"
          required
        />

        {(localError || authError) && (
          <div className="login-error">{localError || authError}</div>
        )}

        {message && <div className="login-success">{message}</div>}

        <Button type="submit" disabled={isSubmitting || !isSupabaseConfigured}>
          {isSubmitting ? "Creazione account..." : "Crea account"}
        </Button>
      </form>

      <div className="auth-footer-link">
        Hai già un account? <Link to="/login">Accedi</Link>
      </div>
    </AuthShell>
  );
}
