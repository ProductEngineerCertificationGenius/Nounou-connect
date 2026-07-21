export default function TrustSeal({ size = 40 }) {
  return (
    <span
      className="trust-seal"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Sceau de confiance : nounou garantie par une agence"
      title="Garantie par l'agence"
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="5 13 10 18 19 7" />
      </svg>
    </span>
  );
}
