// src/components/groups/GroupColorSquare.tsx
import clsx from "clsx";

const HEX = /^#[0-9A-Fa-f]{6}$/;

export default function GroupColorSquare({
  color,
  size = 20,
  width,
  height,
  className,
}: {
  color?: string | null;
  size?: number | string; // aceita número (px) ou string ("100%")
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  const isValid = !!color && HEX.test(color);
  const safe = isValid ? (color as string) : "#E5E7EB"; // fallback neutral-200

  const w = width ?? size;
  const h = height ?? size;

  return (
    <span
      aria-label="Cor do grupo"
      title={safe}
      className={clsx(
        "inline-block rounded-sm border border-black/10 align-middle flex-shrink-0",
        className
      )}
      style={{
        backgroundColor: safe,
        minWidth: typeof w === "number" ? `${w}px` : w,
        minHeight: typeof h === "number" ? `${h}px` : h,
      }}
    />
  );
}
