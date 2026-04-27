function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthCard;
