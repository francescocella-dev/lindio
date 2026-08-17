import Card from "../ui/Card.jsx";
import Input from "../ui/Input.jsx";

export default function AccountSettingsCards({
  isEditing,
  draft,
  authUser,
  profile,
  organization,
  onOrganizationChange,
  onProfileChange
}) {
  return (
    <>
      <Card title="Dati azienda" className="settings-card">
        {isEditing ? (
          <div className="settings-form-grid">
            <Input
              label="Nome azienda"
              value={draft.organization.name}
              onChange={(value) => onOrganizationChange("name", value)}
              placeholder="Es. Impresa Rossi"
              required
            />

            <Input
              label="Settore"
              value={draft.organization.sector}
              onChange={(value) => onOrganizationChange("sector", value)}
              placeholder="Es. Pulizie e servizi"
              required
            />

            <Input
              label="Città"
              value={draft.organization.city}
              onChange={(value) => onOrganizationChange("city", value)}
              placeholder="Es. Roma"
              required
            />

            <Input
              label="Telefono azienda"
              value={draft.organization.phone}
              onChange={(value) => onOrganizationChange("phone", value)}
              placeholder="Numero aziendale"
            />

            <Input
              label="Email azienda"
              type="email"
              value={draft.organization.email}
              onChange={(value) => onOrganizationChange("email", value)}
              placeholder="Email aziendale"
            />

            <Input
              label="Indirizzo / zona operativa"
              value={draft.organization.address}
              onChange={(value) => onOrganizationChange("address", value)}
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
              onChange={(value) => onProfileChange("fullName", value)}
              placeholder="Nome operatore"
              required
            />

            <Input
              label="Email login"
              value={authUser?.email || ""}
              onChange={() => {}}
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
    </>
  );
}
