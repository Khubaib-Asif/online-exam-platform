import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Button } from "@components/ui/Button";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useVerifyEmailMutation } from "@/redux/services/authApi";
import { useAppDispatch } from "@redux/hooks";
import { setAuth } from "@/redux/slices/authSlice";

export const VerifyEmailScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [status, setStatus] = useState<"VERIFYING" | "SUCCESS" | "ERROR">(
    token ? "VERIFYING" : "ERROR"
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No email verification token provided in link."
  );

  useEffect(() => {
    if (!token) return;

    const runVerification = async () => {
      try {
        const res = await verifyEmail({ token }).unwrap();
        if (res.data?.accessToken && res.data?.user) {
          dispatch(
            setAuth({
              user: {
                id: res.data.user.id,
                email: res.data.user.email,
                fullName: `${res.data.user.firstName} ${res.data.user.lastName}`,
                role: res.data.user.role,
                isEmailVerified: true,
              },
              accessToken: res.data.accessToken,
            })
          );
        }
        setStatus("SUCCESS");
      } catch (err: any) {
        setStatus("ERROR");
        setErrorMessage(
          err.data?.message ||
          err.data?.error?.message ||
          err.message ||
          "Verification link is invalid or has expired."
        );
      }
    };

    runVerification();
  }, [token, verifyEmail, dispatch]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <CredentialPanel
        title="Email Verification"
        subtitle="Activating your examination account"
      >
        <div className="flex flex-col gap-4 text-center py-2">
          {status === "VERIFYING" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-[#4C70A6] animate-spin" />
              <p className="text-xs text-slate-600 font-medium">
                Verifying your email token with server...
              </p>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Email Verified Successfully!</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Your email address has been confirmed in the system. You now have full access to examination registrations and paper catalogues.
              </p>
              <Button
                variant="primary"
                size="md"
                className="w-full mt-2"
                onClick={() => navigate("/dashboard")}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Dashboard
              </Button>
            </div>
          )}

          {status === "ERROR" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <XCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Verification Failed</h3>
              <p className="text-xs text-red-700 bg-red-50 p-3 rounded-md border border-red-200 w-full text-left">
                {errorMessage}
              </p>
              <div className="flex gap-2 w-full mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/verify-email-nag")}
                >
                  Resend Link
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          )}
        </div>
      </CredentialPanel>
    </div>
  );
};
