export default function StatCard({ value, label }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 py-5 text-center">
      <p className="font-mono text-2xl font-medium text-palm-dark">{value}</p>
      <p className="text-xs text-ink/60">{label}</p>
    </div>
  );
}
