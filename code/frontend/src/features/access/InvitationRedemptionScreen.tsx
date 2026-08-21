import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useRedeemExamInvitationMutation } from "@/redux/services/registrationApi";

export const InvitationRedemptionScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const [redeemInvitation, { isLoading }] = useRedeemExamInvitationMutation();
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage("Please enter a valid invitation code.");
      setStatus("ERROR");
      return;
    }

    setStatus("LOADING");
    try {
      await redeemInvitation({ token: code.trim() }).unwrap();
      setStatus("SUCCESS");
    } catch (err: any) {
      setStatus("ERROR");
      setErrorMessage(err.data?.message || err.message || "Invitation code is invalid, expired, or already redeemed.");
    }
  };

  return (
    <AppLayout pageTitle="Redeem Exam Invitation">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/catalogue")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalogue</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-[#4C70A6]/10 text-[#4C70A6] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Redeem Invitation Code</h1>
              <p className="text-xs text-slate-500">
                Enter your single-use code issued by your instructor.
              </p>
            </div>
          </div>

          {status === "SUCCESS" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 flex flex-col items-center text-center gap-3 my-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Invitation Redeemed Successfully!</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  You are now registered for <strong>CS 401 — Distributed Systems</strong>.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/exam/ex-401")}
              >
                Go to Exam Details
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRedeem} className="flex flex-col gap-4 mt-4">
              <Input
                label="Invitation Code"
                placeholder="e.g. EXAM-INV-8F92-4A"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (status === "ERROR") setStatus("IDLE");
                }}
                error={status === "ERROR" ? errorMessage : undefined}
                helperText="Codes are case-insensitive and single-use per user."
              />

              {status === "ERROR" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={status === "LOADING"}
                className="w-full mt-2"
              >
                Redeem Code
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Invitation codes are bound to your user identity upon redemption.</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
