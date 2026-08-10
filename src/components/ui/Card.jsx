export default function Card({ children, title, className = "" }) {
  return (
    <section className={`card ${className}`.trim()}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
