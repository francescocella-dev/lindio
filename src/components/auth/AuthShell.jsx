export default function AuthShell({ eyebrow, title, description, children }) {
  return (
    <main className="login-page login-page-pro">
      <section className="login-centered-shell">
        <section className="login-card login-card-pro login-card-centered">
          <div className="login-card-brand">
            <img src="/brand/lindio-logo.png" alt="Lindio" />
          </div>

          <div className="login-card-title">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            {description && <p className="auth-description">{description}</p>}
          </div>

          {children}
        </section>
      </section>
    </main>
  );
}
