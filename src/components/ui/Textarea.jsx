export default function Textarea({ label, value, onChange, ...props }) {
  return (
    <label className="field">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  );
}
