import type { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
}
function Card({
    children,
    className = "",
}: CardProps) {
    return (
        <div
            className={`bg-white rounded-md border border-gray-200 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.05)] ${className}`}
        >
            {children}
        </div>
    );
}


interface DividerProps {
    className?: string;
}
function Divider({ className = "" }: DividerProps) {
    return <div className={`bg-gray-200 ${className}`} />;
}


interface DividerWithTextProps {
    text: string;
    className?: string;
}
function DividerWithText({ text, className = "" }: DividerWithTextProps) {
    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <Divider className="grow h-0.5" />
            <span className="text-gray-500 text-sm">{text}</span>
            <Divider className="grow h-0.5" />
        </div>
    );
}


interface LabelProps {
    children: React.ReactNode;
}
function Label({ children }: LabelProps) {
    return (
        <label className="block text-gray-900 text-sm font-medium font-display leading-normal">
            {children}
        </label>
    );
}


interface InputProps {
    label?: string;
    placeholder?: string;
    type?: string;
    readonly?: boolean;
    disabled?: boolean;
    hint?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}
function Input({
    label,
    placeholder,
    type = "text",
    readonly = false,
    disabled = false,
    hint,
    value,
    onChange,
    className = "",
}: InputProps) {
    return (
        <div className={`flex flex-col items-start w-full ${className}`}>
            {label && (
                <Label>{label}</Label>
            )}
            <div className="relative w-full">
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    readOnly={readonly}
                    disabled={disabled}
                    className={`h-11 w-full rounded-xs border border-gray-200 ${disabled ? 'bg-gray-300' : 'bg-white'} px-4 text-base text-gray-900 transition-colors outline-none placeholder:text-gray-400 focus:border-blue-500`}
                />
            </div>
            {hint && <p className="text-sm text-gray-400">{hint}</p>}
        </div>
    );
}


interface FieldProps {
    label: string;
    children: React.ReactNode;
}
function Field({
    label,
    children,
}: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}


interface ButtonProps {
    children: ReactNode;
    variant?: "primary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    type?: "button" | "submit" | "reset";
    className?: string;
}
function Button({
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    onClick,
    type = "button",
    className = "",
}: ButtonProps) {
    const base =
        "inline-flex items-center justify-center font-medium rounded-xs transition-opacity cursor-pointer";
    const sizes = {
        sm: "h-8 px-4 text-sm",
        md: "h-12 px-6 text-base",
        lg: "h-12 px-6 text-base",
    };
    const variants = {
        primary: "bg-blue-500 text-white hover:opacity-80",
        outline: "bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-100",
        ghost: "bg-[rgba(255,255,255,0.08)] text-white border-2 border-[rgba(255,255,255,0.15)]",
        danger: "bg-destructive text-error border border-error rounded-1.5 hover:bg-error/40",
    };
    return (
        <button
            type={type}
            onClick={onClick}
            className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        >
            {children}
        </button>
    );
}


interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
}
function Logo({ size = "md" }: LogoProps) {
    const sizeClass =
        size === "sm" ? "text-xl" : size === "lg" ? "text-3xl" : size === "xl" ? "text-4xl" : "text-2xl";
    return (
        <div className={`font-display flex items-center ${sizeClass}`}>
            <span className="font-bold text-gray-900">Exam</span>
            <span className="font-light text-blue-500">Platform</span>
        </div>
    );
}

export { Card, Divider, DividerWithText, Label, Input, Field, Button, Logo };