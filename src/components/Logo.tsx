// src/components/Logo.tsx
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/icons/nounou-icon.svg"
      alt="Nounou Connect"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}