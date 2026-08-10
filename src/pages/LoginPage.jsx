import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

export default function LoginPage() {
  const { login, enterDemo, authError, isSupabaseConfigured } = useOutletContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setLocalError("Inserisci email e password.");
      return;
    }

    setIsSubmitting(true);
    setLocalError("");

    try {
      await login(email.trim(), password);
    } catch (error) {
      setLocalError(error.message || "Accesso non riuscito.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Accesso"
      title="Entra in Lindio"
      description="Accedi al workspace aziendale oppure esplora la demo locale senza creare un account."
    >
      {!isSupabaseConfigured && (
        <div className="login-warning">
          Supabase non è configurato su questo ambiente. L'accesso reale è disabilitato, ma la demo locale resta disponibile.
        </div>
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

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Password"
          autoComplete="current-password"
          required
        />

        {(localError || authError) && (
          <div className="login-error">{localError || authError}</div>
        )}

        <Button type="submit" disabled={isSubmitting || !isSupabaseConfigured}>
          {isSubmitting ? "Accesso in corso..." : "Accedi"}
        </Button>
      </form>

      <div className="auth-links-row">
        <Link to="/forgot-password">Password dimenticata?</Link>
        <Link to="/signup">Crea account</Link>
      </div>

      <div className="auth-divider"><span>oppure</span></div>

      <div className="demo-access-card">
        <div>
          <strong>Demo locale</strong>
          <span>Dati sintetici, nessun account e nessun dato inviato a Supabase.</span>
        </div>
        <Button type="button" variant="secondary" onClick={enterDemo}>
          Esplora la demo
        </Button>
      </div>
    </AuthShell>
  );
}
