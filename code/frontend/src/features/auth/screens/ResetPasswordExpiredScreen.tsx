import React from "react";
import { Link } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Button } from "@components/ui/Button";
import { AlertCircle, ArrowLeft, Send } from "lucide-react";

export const ResetPasswordExpiredScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <CredentialPanel
        title="Link Expired"
        subtitle="This password reset link is invalid or has expired."
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-[3px] text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              For security, password reset links expire after 15 minutes or upon single use.
            </span>
          </div>

          <Link to="/forgot-password" className="w-full">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon={<Send className="w-4 h-4" />}
            >
              Request new reset link
            </Button>
          </Link>

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