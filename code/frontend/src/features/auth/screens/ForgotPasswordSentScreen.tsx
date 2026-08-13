import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Button } from "@components/ui/Button";
import { ArrowLeft, RefreshCw, KeyRound, MailCheck } from "lucide-react";

export const ForgotPasswordSentScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email || "your email address";
  const [isResending, setIsResending] = useState(false);
  const [resentMessage, setResentMessage] = useState(false);

  const handleResend = () => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      setResentMessage(true);
      setTimeout(() => setResentMessage(false), 3500);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <CredentialPanel
        title="Check your email"
        subtitle="Password recovery instructions sent"
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-4 py-3.5 rounded-md leading-relaxed font-sans text-left">
            If an account is registered with <strong className="text-slate-900 font-mono break-all">{email}</strong>, we have sent a password reset link. Please check your inbox and spam folder.
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            For security reasons, password reset links expire after 15 minutes.
          </p>

          {resentMessage && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
              Password reset link resent if the email is registered.
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            className="w-full border-slate-300 hover:bg-slate-50 font-medium"
            isLoading={isResending}
            onClick={handleResend}
            icon={<RefreshCw className="w-4 h-4 text-slate-600" />}
          >
            Resend email
          </Button>

          {/* Demo shortcut */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-[#4C70A6] border-[#4C70A6]/30 hover:bg-slate-50 mt-1"
            onClick={() => navigate("/reset-password")}
            icon={<KeyRound className="w-3.5 h-3.5" />}
          >
            Simulate Email Link Click (Go to Reset Password)
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