import React, { useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  icon?: React.ReactNode | undefined;
  showPasswordToggle?: boolean | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      showPasswordToggle = false,
      type = "text",
      className,
      id,
      ...props
    },
    ref
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const isPasswordType = type === "password" || showPasswordToggle;
    const computedType = isPasswordType
      ? isPasswordVisible
        ? "text"
        : "password"
      : type;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-700 tracking-wide select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              {icon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={computedType}
            className={twMerge(
              clsx(
                "w-full bg-white text-slate-900 placeholder-slate-400 text-sm border rounded-[3px] transition-all duration-150 focus:outline-none",
                icon ? "pl-9" : "px-3.5",
                isPasswordType ? "pr-10" : "pr-3.5",
                "py-2.5",
                error
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-slate-300 hover:border-slate-400 focus:border-[#4C70A6] focus:ring-2 focus:ring-[#4C70A6]/25",
                className
              )
            )}
            {...props}
          />

          {isPasswordType && (
            <button
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-sm cursor-pointer"
              tabIndex={-1}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {error ? (
          <span className="text-xs text-red-600 font-medium animate-fadeIn">
            {error}
          </span>
        ) : helperText ? (
          <span className="text-xs text-slate-500">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";