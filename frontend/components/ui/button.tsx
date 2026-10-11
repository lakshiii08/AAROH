import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-emerald text-white hover:bg-emerald-dark active:bg-emerald-dark shadow-xs",
  secondary: "bg-amber text-white hover:bg-amber-dark active:bg-amber-dark shadow-xs",
  outline: "border border-gray-300 text-ink bg-white hover:bg-gray-50 active:bg-gray-100 shadow-xs",
  ghost: "text-ink hover:bg-gray-100 active:bg-gray-200",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg font-medium",
  md: "text-sm px-4 py-2 rounded-lg font-semibold",
  lg: "text-base px-5 py-2.5 rounded-xl font-semibold",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
