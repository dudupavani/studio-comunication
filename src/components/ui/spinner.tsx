import React from "react";

type SpinnerSize = "sm" | "md" | "lg" | "xl";
type SpinnerColor = "blue" | "green" | "red" | "white" | "gray" | "dark";

interface SpinnerProps {
  /** O tamanho do spinner. O padrão é 'md'. */
  size?: SpinnerSize;
  /** A cor do spinner. O padrão é 'blue'. */
  color?: SpinnerColor;
  /** Classes CSS adicionais para aplicar ao elemento do spinner. */
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "w-6 h-6 border-2",
  md: "w-8 h-8 border-4",
  lg: "w-12 h-12 border-4",
  xl: "w-16 h-16 border-[6px]",
};

const colorClasses: Record<SpinnerColor, string> = {
  blue: "border-blue-500",
  green: "border-green-500",
  red: "border-red-500",
  white: "border-white",
  gray: "border-gray-500",
  dark: "border-gray-700",
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = "lg",
  color = "dark",
  className = "",
}) => {
  const baseClasses = "rounded-full animate-spin border-t-gray-300";

  // Verifica se o tamanho ou a cor passados são válidos. Se não forem,
  // usa os valores padrão para evitar erros.
  const spinnerSizeClass = sizeClasses[size as SpinnerSize] || sizeClasses.md;
  const spinnerColorClass =
    colorClasses[color as SpinnerColor] || colorClasses.blue;

  const combinedClasses = `${baseClasses} ${spinnerSizeClass} ${spinnerColorClass} ${className}`;

  return (
    <div
      className={combinedClasses}
      role="status"
      aria-label="carregando"></div>
  );
};
