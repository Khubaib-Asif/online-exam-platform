import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "link" | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  isLoading?: boolean | undefined;
  icon?: React.ReactNode | undefined;
  iconPosition?: "left" | "right" | undefined;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  iconPosition = "left",
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#4C70A6]/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 rounded-[3px] select-none cursor-pointer";

  const variants = {
    primary:
      "bg-[#4C70A6] hover:bg-[#3F5E8E] active:bg-[#355079] text-white shadow-xs border border-transparent",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs hover:border-slate-400",
    outline:
      "bg-transparent hover:bg-slate-100/80 text-slate-700 border border-slate-300",
    danger:
      "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs border border-transparent",
    ghost:
      "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900",
    link:
      "bg-transparent text-[#4C70A6] hover:text-[#3F5E8E] hover:underline p-0 h-auto border-none",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 h-8 gap-1.5",
    md: "text-sm px-4 py-2.5 h-10 gap-2",
    lg: "text-base px-6 py-3 h-12 gap-2.5",
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          variants[variant],
          variant !== "link" && sizes[size],
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </span>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className="shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
};