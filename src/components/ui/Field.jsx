export default function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
