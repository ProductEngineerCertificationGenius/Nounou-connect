export default function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <h3 className="font-display text-lg">{title}</h3>
      {description && <p className="max-w-xs text-sm text-ink/60">{description}</p>}
      {action}
    </div>
  );
}
