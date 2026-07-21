export default function Stars({ rating = 0, size = "text-sm" }) {
  const full = Math.round(rating);
  return (
    <span className={`${size} tracking-tight text-gold`} aria-label={`Note ${rating} sur 5`}>
      {"★".repeat(full)}
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}
