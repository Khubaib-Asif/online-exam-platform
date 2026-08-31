import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@components/ui/Button";
import { Shield, LogIn, UserPlus } from "lucide-react";

export const LandingScreen: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 select-none">
            <div className="w-full max-w-sm flex flex-col items-center text-center">
                {/* Brand Shield Logo */}
                <div className="w-14 h-14 rounded-2xl bg-[#4C70A6] text-white flex items-center justify-center shadow-lg mb-5 ring-4 ring-[#4C70A6]/20">
                    <Shield className="w-8 h-8" />
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Exam Platform
                </h1>
                <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed font-normal">
                    Use your institutional account to access examinations, question banks, grading, and integrity controls.
                </p>

                {/* Action Buttons */}
                <div className="w-full flex flex-col gap-3 mt-8">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold shadow-xs py-3"
                        onClick={() => navigate("/login")}
                        icon={<LogIn className="w-4 h-4" />}
                    >
                        Sign in to Platform
                    </Button>

                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold py-3"
                        onClick={() => navigate("/signup")}
                        icon={<UserPlus className="w-4 h-4 text-slate-600" />}
                    >
                        Create Student Account
                    </Button>
                </div>

                {/* Footer info */}
                <div className="mt-12 text-[11px] text-slate-400 font-mono">
                    Secure Examination System • Server-Authoritative Engine v2.0
                </div>
            </div>
        </div>
    );
};