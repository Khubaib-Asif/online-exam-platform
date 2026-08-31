import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "primary" | undefined;
  icon?: React.ReactNode | undefined;
  className?: string | undefined;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  icon,
  className,
}) => {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-700 border-amber-200/80",
    error: "bg-red-50 text-red-700 border-red-200/80",
    info: "bg-sky-50 text-sky-700 border-sky-200/80",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border rounded-full select-none tracking-wide",
          styles[variant],
          className
        )
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};