import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import LogoutConfirmModal from "../components/ui/LogoutConfirmModal.jsx";
import AccountSettingsCards from "../components/settings/AccountSettingsCards.jsx";
import ReminderPreferencesCard from "../components/settings/ReminderPreferencesCard.jsx";
import SecuritySessionCards from "../components/settings/SecuritySessionCards.jsx";
import {
  checkReminderNotifications,
  getNotificationPermission,
  requestReminderPermission,
  sendTestNotification
} from "../services/notificationService.js";

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
    changePassword,
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
      await changePassword(passwordDraft.newPassword);

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
        <AccountSettingsCards
          isEditing={isEditing}
          draft={draft}
          authUser={authUser}
          profile={profile}
          organization={organization}
          onOrganizationChange={patchOrganization}
          onProfileChange={patchProfile}
        />

        <ReminderPreferencesCard
          draft={draft}
          hasUnsavedChanges={hasUnsavedChanges}
          notificationStatusLabel={notificationStatusLabel}
          notificationMessage={notificationMessage}
          notificationOptions={NOTIFICATION_OPTIONS}
          onToggleNotifications={handleToggleNotifications}
          onReminderOptionChange={(value) => patchProfile("notificationReminderOption", value)}
          onSendTestNotification={handleSendTestNotification}
          onCheckReminderNow={handleCheckReminderNow}
        />

        <SecuritySessionCards
          isDemoMode={isDemoMode}
          passwordDraft={passwordDraft}
          passwordError={passwordError}
          passwordMessage={passwordMessage}
          isChangingPassword={isChangingPassword}
          onPasswordChange={patchPassword}
          onChangePassword={handleChangePassword}
          onRequestLogout={() => setIsLogoutOpen(true)}
        />
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
