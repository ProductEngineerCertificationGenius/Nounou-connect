export function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Nounou Connect"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}
