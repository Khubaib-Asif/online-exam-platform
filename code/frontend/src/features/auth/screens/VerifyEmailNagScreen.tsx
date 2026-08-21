import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "@redux/hooks";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Button } from "@components/ui/Button";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useRequestEmailVerificationMutation } from "@/redux/services/authApi";

export const VerifyEmailNagScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [requestVerification, { isLoading: isResending }] = useRequestEmailVerificationMutation();

  const [resendSuccess, setResendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const email = user?.email || "your-email@institution.edu";

  const handleResend = async () => {
    setErrorMessage(null);
    try {
      await requestVerification({ email: user?.email }).unwrap();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      console.error("Resend verification error:", err);
      setErrorMessage(
        err.data?.message || err.data?.error?.message || "Failed to resend verification email."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <CredentialPanel
        title="Verify your email"
        subtitle="We've sent a verification link to:"
      >
        <div className="flex flex-col gap-4 text-center">
          {/* Highlighted Email Box */}
          <div className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm px-4 py-3 rounded-[3px] break-all flex items-center justify-center gap-2">
            <Mail className="w-4 h-4 text-[#4C70A6] shrink-0" />
            <span>{email}</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Please check your inbox and click the verification link in the email to activate your account.
          </p>

          {resendSuccess && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[3px] flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Verification link resent! Check your inbox.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-[3px] flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            className="w-full border-slate-300 hover:bg-slate-50 mt-1"
            isLoading={isResending}
            onClick={handleResend}
            icon={<RefreshCw className="w-4 h-4 text-slate-600" />}
          >
            Resend verification email
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