import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import LogoutConfirmModal from "../components/ui/LogoutConfirmModal.jsx";
import {
  checkReminderNotifications,
  getNotificationPermission,
  requestReminderPermission,
  sendTestNotification
} from "../services/notificationService.js";
import { updateUserPassword } from "../services/authService.js";

const NOTIFICATION_OPTIONS = [
  "Alla scadenza",
  "15 minuti prima",
  "30 minuti prima",
  "1 ora prima",
  "1 giorno prima"
];

const NOTIFICATION_MINUTES = {
  "Alla scadenza": 0,
  "15 minuti prima": 15,
  "30 minuti prima": 30,
  "1 ora prima": 60,
  "1 giorno prima": 1440
};

function getNotificationOptionFromMinutes(minutes) {
  const value = Number(minutes ?? 30);

  return (
    Object.entries(NOTIFICATION_MINUTES).find(([, optionValue]) => optionValue === value)?.[0] ||
    "30 minuti prima"
  );
}

function getInitialDraft(profile, organization) {
  return {
    organization: {
      name: organization?.name || "",
      sector: organization?.sector || "",
      city: organization?.city || "",
      phone: organization?.phone || "",
      email: organization?.email || "",
      address: organization?.address || ""
    },
    profile: {
      fullName: profile?.fullName || "",
      notificationEnabled: Boolean(profile?.notificationEnabled),
      notificationReminderOption: getNotificationOptionFromMinutes(profile?.notificationMinutesBefore)
    }
  };
}

function isProfileComplete(profile, organization) {
  return Boolean(
    profile?.fullName?.trim() &&
    organization?.name?.trim() &&
    organization?.sector?.trim() &&
    organization?.city?.trim()
  );
}

function getInitials(value) {
  const text = String(value || "LI").trim();

  return text.slice(0, 2).toUpperCase();
}

export default function SettingsPage() {
  const {
    logout,
    authUser,
    profile,
    organization,
    updateAccount,
    leads,
    isDemoMode
  } = useOutletContext();

  const [draft, setDraft] = useState(() => getInitialDraft(profile, organization));
  const [isEditing, setIsEditing] = useState(!isProfileComplete(profile, organization));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [permissionState, setPermissionState] = useState(() => getNotificationPermission());
  const [notificationMessage, setNotificationMessage] = useState("");

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [passwordDraft, setPasswordDraft] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const profileComplete = useMemo(
    () => isProfileComplete(profile, organization),
    [profile, organization]
  );

  const showSaveBar = isEditing || hasUnsavedChanges || !profileComplete;

  function markDirty() {
    setHasUnsavedChanges(true);
    setSaveMessage("");
    setSaveError("");
  }

  function resetDraft() {
    setDraft(getInitialDraft(profile, organization));
    setHasUnsavedChanges(false);
    setSaveMessage("");
    setSaveError("");
  }

  function patchOrganization(field, value) {
    setDraft((current) => ({
      ...current,
      organization: {
        ...current.organization,
        [field]: value
      }
    }));
    markDirty();
  }

  function patchProfile(field, value) {
    setDraft((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value
      }
    }));
    markDirty();
  }

  function patchPassword(field, value) {
    setPasswordDraft((current) => ({
      ...current,
      [field]: value
    }));
    setPasswordMessage("");
    setPasswordError("");
  }

  async function handleToggleNotifications(value) {
    const enabled = value === "Sì";
    setNotificationMessage("");

    if (enabled) {
      const permission = await requestReminderPermission();
      setPermissionState(permission);

      if (permission !== "granted") {
        setSaveError("Per attivare i promemoria devi consentire le notifiche dal browser.");
        patchProfile("notificationEnabled", false);
        return;
      }
    }

    patchProfile("notificationEnabled", enabled);
  }

  async function handleSendTestNotification() {
    setNotificationMessage("");

    const result = await sendTestNotification();

    setPermissionState(getNotificationPermission());
    setNotificationMessage(result.reason);
  }

  async function handleCheckReminderNow() {
    setNotificationMessage("");

    const reminderProfile = {
      ...profile,
      notificationEnabled: draft.profile.notificationEnabled,
      notificationMinutesBefore: NOTIFICATION_MINUTES[draft.profile.notificationReminderOption] ?? 30
    };

    const result = await checkReminderNotifications(leads, reminderProfile);

    setNotificationMessage(result.reason);
  }

  async function handleSave() {
    if (!draft.organization.name.trim() || !draft.organization.sector.trim() || !draft.organization.city.trim()) {
      setSaveError("Inserisci nome azienda, settore e città.");
      return;
    }

    if (!draft.profile.fullName.trim()) {
      setSaveError("Inserisci il nome dell’utente.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const account = await updateAccount({
        organization: draft.organization,
        profile: {
          fullName: draft.profile.fullName,
          notificationEnabled: draft.profile.notificationEnabled,
          notificationMinutesBefore: NOTIFICATION_MINUTES[draft.profile.notificationReminderOption] ?? 30
        }
      });

      setDraft(getInitialDraft(account.profile, account.organization));
      setHasUnsavedChanges(false);
      setSaveMessage("Profilo e preferenze salvati correttamente.");
      setIsEditing(false);
      window.setTimeout(() => setSaveMessage(""), 2200);
    } catch (error) {
      setSaveError(error?.message || "Non è stato possibile salvare il profilo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordMessage("");
    setPasswordError("");

    if (passwordDraft.newPassword.length < 8) {
      setPasswordError("La nuova password deve avere almeno 8 caratteri.");
      return;
    }

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setPasswordError("Le due password non coincidono.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await updateUserPassword(passwordDraft.newPassword);

      setPasswordDraft({
        newPassword: "",
        confirmPassword: ""
      });
      setPasswordMessage("Password aggiornata correttamente.");
    } catch (error) {
      setPasswordError(error?.message || "Non è stato possibile aggiornare la password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutOpen(false);
    }
  }

  const notificationStatusLabel =
    permissionState === "granted"
      ? "Autorizzate"
      : permissionState === "denied"
        ? "Bloccate dal browser"
        : permissionState === "unsupported"
          ? "Non supportate"
          : "Da autorizzare";

  return (
    <section className="page settings-page settings-clean-page">
      <header className="page-header settings-page-header">
        <div>
          <span>Profilo</span>
          <h1>Profilo e preferenze</h1>
        </div>

        {!isEditing && (
          <Button variant="secondary" type="button" onClick={() => setIsEditing(true)}>
            Modifica profilo
          </Button>
        )}
      </header>

      {!profileComplete && (
        <div className="settings-required-banner">
          <strong>Completa il profilo</strong>
          <span>Inserisci i dati principali dell’azienda prima di usare Lindio.</span>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="settings-unsaved-banner">
          <strong>Modifiche non salvate</strong>
          <span>Premi “Salva modifiche” per rendere effettive le modifiche a profilo o preferenze.</span>
        </div>
      )}

      <section className="settings-hero-card settings-clean-hero">
        <div className="settings-company-avatar">{getInitials(organization?.name)}</div>

        <div>
          <span>Account aziendale</span>
          <h2>{organization?.name || "Azienda da configurare"}</h2>
          <p>
            {organization?.sector || "Settore non indicato"} · {organization?.city || "Città non indicata"} ·{" "}
            {profile?.fullName || "Utente"}
          </p>
        </div>
      </section>

      {saveError && (
        <div className="app-alert app-alert-error">
          <strong>Errore</strong>
          <span>{saveError}</span>
        </div>
      )}

      {saveMessage && (
        <div className="app-alert app-alert-success">
          <strong>Salvato</strong>
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="settings-clean-grid">
        <Card title="Dati azienda" className="settings-card">
          {isEditing ? (
            <div className="settings-form-grid">
              <Input
                label="Nome azienda"
                value={draft.organization.name}
                onChange={(value) => patchOrganization("name", value)}
                placeholder="Es. Impresa Rossi"
                required
              />

              <Input
                label="Settore"
                value={draft.organization.sector}
                onChange={(value) => patchOrganization("sector", value)}
                placeholder="Es. Pulizie e servizi"
                required
              />

              <Input
                label="Città"
                value={draft.organization.city}
                onChange={(value) => patchOrganization("city", value)}
                placeholder="Es. Roma"
                required
              />

              <Input
                label="Telefono azienda"
                value={draft.organization.phone}
                onChange={(value) => patchOrganization("phone", value)}
                placeholder="Numero aziendale"
              />

              <Input
                label="Email azienda"
                type="email"
                value={draft.organization.email}
                onChange={(value) => patchOrganization("email", value)}
                placeholder="Email aziendale"
              />

              <Input
                label="Indirizzo / zona operativa"
                value={draft.organization.address}
                onChange={(value) => patchOrganization("address", value)}
                placeholder="Indirizzo o zona servita"
              />
            </div>
          ) : (
            <div className="settings-info-list">
              <div className="settings-info-row">
                <span>Nome azienda</span>
                <strong>{organization?.name || "-"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Settore</span>
                <strong>{organization?.sector || "-"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Città</span>
                <strong>{organization?.city || "-"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Telefono</span>
                <strong>{organization?.phone || "-"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Email azienda</span>
                <strong>{organization?.email || "-"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Zona operativa</span>
                <strong>{organization?.address || "-"}</strong>
              </div>
            </div>
          )}
        </Card>

        <Card title="Dati utente" className="settings-card">
          {isEditing ? (
            <div className="settings-form-grid">
              <Input
                label="Nome utente"
                value={draft.profile.fullName}
                onChange={(value) => patchProfile("fullName", value)}
                placeholder="Nome operatore"
                required
              />

              <Input
                label="Email login"
                value={authUser?.email || ""}
                onChange={() => { }}
                disabled
              />
            </div>
          ) : (
            <div className="settings-info-list">
              <div className="settings-info-row">
                <span>Utente</span>
                <strong>{profile?.fullName || "-"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Ruolo</span>
                <strong>{profile?.role || "owner"}</strong>
              </div>

              <div className="settings-info-row">
                <span>Email login</span>
                <strong>{authUser?.email || "-"}</strong>
              </div>
            </div>
          )}
        </Card>

        <Card title="Preferenze promemoria" className="settings-card">
          <div className="settings-preferences-copy">
            <p>
              I promemoria usano le notifiche del browser. Per riceverli, devono essere abilitate sia nel browser sia nelle impostazioni del dispositivo.
            </p>
            <small>Stato notifiche browser: {notificationStatusLabel}</small>
          </div>

          <div className="settings-form-grid">
            <Select
              label="Notifiche promemoria"
              value={draft.profile.notificationEnabled ? "Sì" : "No"}
              options={["No", "Sì"]}
              onChange={handleToggleNotifications}
            />

            {draft.profile.notificationEnabled && (
              <Select
                label="Quando avvisarmi"
                value={draft.profile.notificationReminderOption}
                options={NOTIFICATION_OPTIONS}
                onChange={(value) => patchProfile("notificationReminderOption", value)}
              />
            )}
          </div>

          <div className="settings-reminder-preview">
            <span>Impostazione scelta</span>
            <strong>
              {draft.profile.notificationEnabled
                ? `Notifica ${draft.profile.notificationReminderOption.toLowerCase()}`
                : "Notifiche disattivate"}
            </strong>
            <small>
              {hasUnsavedChanges
                ? "Questa scelta non è ancora salvata."
                : "Questa è la preferenza attualmente salvata."}
            </small>
          </div>

          {notificationMessage && (
            <div className="settings-inline-message">
              {notificationMessage}
            </div>
          )}

          <div className="settings-card-actions">
            <Button variant="secondary" type="button" onClick={handleSendTestNotification}>
              Invia notifica di test
            </Button>

            <Button variant="secondary" type="button" onClick={handleCheckReminderNow}>
              Controlla promemoria ora
            </Button>
          </div>
        </Card>

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
                  onChange={(value) => patchPassword("newPassword", value)}
                  placeholder="Almeno 8 caratteri"
                />

                <Input
                  label="Conferma nuova password"
                  type="password"
                  value={passwordDraft.confirmPassword}
                  onChange={(value) => patchPassword("confirmPassword", value)}
                  placeholder="Ripeti la nuova password"
                />
              </div>

              {passwordError && (
                <div className="settings-inline-message settings-inline-error">
                  {passwordError}
                </div>
              )}

              {passwordMessage && (
                <div className="settings-inline-message settings-inline-success">
                  {passwordMessage}
                </div>
              )}

              <div className="settings-card-actions">
                <Button type="button" onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? "Aggiornamento..." : "Cambia password"}
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card title="Sessione" className="settings-card settings-danger-zone">
          <p>{isDemoMode ? "Uscendo chiudi la demo locale. Le modifiche ai dati demo restano nel browser finché non li reimposti." : "Uscendo chiudi la sessione su questo browser. I dati salvati resteranno disponibili al prossimo accesso."}</p>
          <Button variant="danger" type="button" onClick={() => setIsLogoutOpen(true)}>
            Esci
          </Button>
        </Card>
      </div>

      {showSaveBar && (
        <div className="settings-sticky-save">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvataggio..." : "Salva modifiche"}
          </Button>

          {profileComplete && (
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                resetDraft();
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Annulla
            </Button>
          )}
        </div>
      )}

      <LogoutConfirmModal
        isOpen={isLogoutOpen}
        isLoading={isLoggingOut}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </section>
  );
}