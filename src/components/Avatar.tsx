// src/components/Avatar.tsx
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: number | string;
  className?: string;
  loading?: "lazy" | "eager";
  fallback?: string;
  rounded?: boolean;
}

export function Avatar({
  src,
  alt,
  size = 48,
  className = "",
  loading = "lazy",
  fallback,
  rounded = true,
}: AvatarProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getInitials = (name: string): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getColorFromName = (name: string): string => {
    const colors = [
      "#F3811E", "#4A7C59", "#C1631B", "#2D6A8A",
      "#8B6B4A", "#6B5E8A", "#F5A855", "#5A8A6B",
      "#B8860B", "#CD853F",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(alt || "?");
  const bgColor = getColorFromName(alt || "?");
  const borderRadius = rounded ? "50%" : "0";
  const isPercentage = typeof size === "string" && size.includes("%");
  const sizeValue = typeof size === "number" ? size : 48;

  if (!src || error) {
    return (
      <div
        className={`avatar-fallback ${className}`}
        style={{
          width: isPercentage ? "100%" : sizeValue,
          height: isPercentage ? "100%" : sizeValue,
          borderRadius,
          backgroundColor: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          fontSize: isPercentage ? 48 : sizeValue * 0.4,
          flexShrink: 0,
          userSelect: "none",
          ...(fallback ? { backgroundImage: `url(${fallback})`, backgroundSize: "cover" } : {}),
        }}
      >
        {fallback ? null : initials}
      </div>
    );
  }

  return (
    <div
      className={`avatar-wrapper ${className}`}
      style={{
        width: isPercentage ? "100%" : sizeValue,
        height: isPercentage ? "100%" : sizeValue,
        borderRadius,
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        backgroundColor: "#F1F0EC",
      }}
    >
      {isLoading && (
        <div
          className="avatar-skeleton"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(90deg, #F1F0EC 25%, #E5DFD2 50%, #F1F0EC 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            borderRadius,
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={() => setError(true)}
        onLoad={() => setIsLoading(false)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}