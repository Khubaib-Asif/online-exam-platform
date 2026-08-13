import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppSelector } from "@redux/hooks";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Button } from "@components/ui/Button";
import { MailCheck, ArrowLeft, RefreshCw } from "lucide-react";
import { updateUser } from "@/redux/slices/authSlice";

export const VerifyEmailNagScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const email = user?.email || "you@institution.edu";

    const handleResend = () => {
        setIsResending(true);
        setTimeout(() => {
            setIsResending(false);
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 4000);
        }, 500);
    };

    const handleSimulateVerify = () => {
        if (user) {
            updateUser({ isEmailVerified: true });
        }
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Verify your email"
                subtitle="We've sent a verification link to:"
            >
                <div className="flex flex-col gap-4 text-center">
                    {/* Highlighted Email Box */}
                    <div className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm px-4 py-3 rounded-[3px] break-all">
                        {email}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Please check your inbox and click the verification link.
                    </p>

                    {resendSuccess && (
                        <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[3px]">
                            Verification link resent successfully!
                        </div>
                    )}

                    <Button
                        variant="secondary"
                        size="md"
                        className="w-full border-slate-300 hover:bg-slate-50"
                        isLoading={isResending}
                        onClick={handleResend}
                        icon={<RefreshCw className="w-4 h-4 text-slate-600" />}
                    >
                        Resend verification email
                    </Button>

                    {/* Quick Demo Simulate Verification Button */}
                    <Button
                        variant="primary"
                        size="sm"
                        className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleSimulateVerify}
                        icon={<MailCheck className="w-4 h-4" />}
                    >
                        Simulate Email Click (Continue to Dashboard)
                    </Button>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1.5 text-xs text-[#4C70A6] hover:underline font-semibold"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Return to sign in</span>
                        </Link>
                    </div>
                </div>
            </CredentialPanel>
        </div>
    );
};