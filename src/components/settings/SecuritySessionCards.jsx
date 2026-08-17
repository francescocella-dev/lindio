import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Input from "../ui/Input.jsx";

export default function SecuritySessionCards({
  isDemoMode,
  passwordDraft,
  passwordError,
  passwordMessage,
  isChangingPassword,
  onPasswordChange,
  onChangePassword,
  onRequestLogout
}) {
  return (
    <>
      <Card title="Password e sicurezza" className="settings-card">
        {isDemoMode ? (
          <div className="settings-preferences-copy">
            <p>La demo locale non usa credenziali reali e non comunica con Supabase Auth.</p>
            <small>Esci dalla demo per accedere o registrare un account reale.</small>
          </div>
        ) : (
          <>
            <div className="settings-preferences-copy">
              <p>Cambia la password dell’account con cui accedi a Lindio.</p>
            </div>

            <div className="settings-form-grid">
              <Input
                label="Nuova password"
                type="password"
                value={passwordDraft.newPassword}
                onChange={(value) => onPasswordChange("newPassword", value)}
                placeholder="Almeno 8 caratteri"
              />

              <Input
                label="Conferma nuova password"
                type="password"
                value={passwordDraft.confirmPassword}
                onChange={(value) => onPasswordChange("confirmPassword", value)}
                placeholder="Ripeti la nuova password"
              />
            </div>

            {passwordError && (
              <div className="settings-inline-message settings-inline-error">{passwordError}</div>
            )}

            {passwordMessage && (
              <div className="settings-inline-message settings-inline-success">
                {passwordMessage}
              </div>
            )}

            <div className="settings-card-actions">
              <Button type="button" onClick={onChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? "Aggiornamento..." : "Cambia password"}
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card title="Sessione" className="settings-card settings-danger-zone">
        <p>
          {isDemoMode
            ? "Uscendo chiudi la demo locale. Le modifiche ai dati demo restano nel browser finché non li reimposti."
            : "Uscendo chiudi la sessione su questo browser. I dati salvati resteranno disponibili al prossimo accesso."}
        </p>
        <Button variant="danger" type="button" onClick={onRequestLogout}>
          Esci
        </Button>
      </Card>
    </>
  );
}
