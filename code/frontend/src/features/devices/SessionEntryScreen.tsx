import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Shield, Loader2, CheckCircle2, Lock } from "lucide-react";

export const SessionEntryScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"HANDSHAKE" | "AUTHENTICATING" | "PASSED">("HANDSHAKE");

  useEffect(() => {
    const t1 = setTimeout(() => setStep("AUTHENTICATING"), 1000);
    const t2 = setTimeout(() => setStep("PASSED"), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <AppLayout pageTitle="Session Entry">
      <div className="max-w-md mx-auto flex flex-col gap-6 text-center">
        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#4C70A6] text-white flex items-center justify-center shadow-md">
            <Shield className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Initializing Secure Session
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Exchanging launch ticket and verifying signed Electron container context.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col gap-3 font-mono text-xs text-left">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Electron Native Bridge:</span>
              {step !== "HANDSHAKE" ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Handshake
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Session Ticket Nonce:</span>
              <span className="font-bold text-slate-800">VALIDATED</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Presentation Mode:</span>
              <span className="font-bold text-slate-800">DESKTOP_LOCKDOWN</span>
            </div>
          </div>

          {step === "PASSED" ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate(`/exam/${examId || "ex-401"}/gates`)}
            >
              Proceed to Security Gates
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Loader2 className="w-4 h-4 text-[#4C70A6] animate-spin" />
              <span>Verifying launch cryptographic signatures...</span>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
