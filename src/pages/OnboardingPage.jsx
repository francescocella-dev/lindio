import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import AuthShell from "../components/auth/AuthShell.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

export default function OnboardingPage() {
  const { authUser, completeOnboarding, logout } = useOutletContext();
  const [fullName, setFullName] = useState(
    authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || ""
  );
  const [organizationName, setOrganizationName] = useState("");
  const [sector, setSector] = useState("Pulizie e servizi");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await completeOnboarding({ fullName, organizationName, sector, city });
    } catch (setupError) {
      setError(setupError.message || "Non è stato possibile creare il workspace.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Prima configurazione"
      title="Crea il workspace aziendale"
      description="Questi dati definiscono il tenant iniziale. Il tuo utente diventerà owner dell'organizzazione."
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Nome e cognome"
          value={fullName}
          onChange={setFullName}
          placeholder="Nome operatore"
          required
        />

        <Input
          label="Nome azienda"
          value={organizationName}
          onChange={setOrganizationName}
          placeholder="Es. Impresa Rossi"
          required
        />

        <Input
          label="Settore"
          value={sector}
          onChange={setSector}
          placeholder="Es. Pulizie e servizi"
          required
        />

        <Input
          label="Città / area operativa"
          value={city}
          onChange={setCity}
          placeholder="Es. Roma"
          required
        />

        {error && <div className="login-error">{error}</div>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creazione workspace..." : "Crea workspace"}
        </Button>
      </form>

      <div className="auth-footer-link">
        <button className="auth-link-button" type="button" onClick={logout}>
          Esci e usa un altro account
        </button>
      </div>
    </AuthShell>
  );
}
