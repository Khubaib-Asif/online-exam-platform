import React from "react";
import { Shield } from "lucide-react";

export interface CredentialPanelProps {
    title: string;
    subtitle?: string | undefined;
    children?: React.ReactNode | undefined;
    className?: string | undefined;
}

export const CredentialPanel: React.FC<CredentialPanelProps> = ({
    title,
    subtitle,
    children,
    className,
}) => {
    return (
        <div
            className={`w-full max-w-md bg-white border border-slate-200/90 p-8 rounded-lg shadow-sm text-center ${className || ""
                }`}
        >
            <div className="mb-6 flex flex-col items-center">
                {/* Brand Shield Logo */}
                <div className="w-12 h-12 rounded-xl bg-[#4C70A6] text-white flex items-center justify-center shadow-md mb-4">
                    <Shield className="w-7 h-7" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-slate-500 mt-1 font-normal leading-snug">
                        {subtitle}
                    </p>
                )}
                <div className="w-full mt-5 border-b border-slate-100" />
            </div>
            {children}
        </div>
    );
};