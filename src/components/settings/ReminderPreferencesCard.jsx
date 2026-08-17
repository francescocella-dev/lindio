import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Select from "../ui/Select.jsx";

export default function ReminderPreferencesCard({
  draft,
  hasUnsavedChanges,
  notificationStatusLabel,
  notificationMessage,
  notificationOptions,
  onToggleNotifications,
  onReminderOptionChange,
  onSendTestNotification,
  onCheckReminderNow
}) {
  return (
    <Card title="Preferenze promemoria" className="settings-card">
      <div className="settings-preferences-copy">
        <p>
          I promemoria sono locali a questo browser e dispositivo. Lindio controlla le scadenze
          mentre l’app è aperta o quando torna in primo piano; non sono notifiche push dal server e
          non sono garantiti quando l’app è completamente chiusa.
        </p>
        <small>Stato notifiche browser: {notificationStatusLabel}</small>
      </div>

      <div className="settings-form-grid">
        <Select
          label="Notifiche promemoria"
          value={draft.profile.notificationEnabled ? "Sì" : "No"}
          options={["No", "Sì"]}
          onChange={onToggleNotifications}
        />

        {draft.profile.notificationEnabled && (
          <Select
            label="Quando avvisarmi"
            value={draft.profile.notificationReminderOption}
            options={notificationOptions}
            onChange={onReminderOptionChange}
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
            : "Questa è la preferenza attualmente salvata sul profilo."}
        </small>
      </div>

      {notificationMessage && (
        <div className="settings-inline-message">{notificationMessage}</div>
      )}

      <div className="settings-card-actions">
        <Button variant="secondary" type="button" onClick={onSendTestNotification}>
          Invia notifica di test
        </Button>

        <Button variant="secondary" type="button" onClick={onCheckReminderNow}>
          Controlla promemoria ora
        </Button>
      </div>
    </Card>
  );
}
