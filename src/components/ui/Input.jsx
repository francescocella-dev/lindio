export default function Input({ label, value, onChange, type = "text", required = false, ...props }) {
  return (
    <label className="field">
      {label}
      <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}
