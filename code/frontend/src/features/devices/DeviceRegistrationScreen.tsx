import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Badge } from "@components/ui/Badge";
import { Smartphone, ShieldCheck, CheckCircle2, ArrowLeft, Loader2, Monitor, ExternalLink } from "lucide-react";

export const DeviceRegistrationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"LAUNCHING" | "REGISTERING" | "SUCCESS">("LAUNCHING");
  const [statusMessage, setStatusMessage] = useState("Launching signed Electron app...");

  useEffect(() => {
    // Step 1: Simulate launching Electron app
    const t1 = setTimeout(() => {
      setStep("REGISTERING");
      setStatusMessage("Extracting native hardware fingerprint & TPM attestation keys...");
    }, 1200);

    // Step 2: Registering in backend
    const t2 = setTimeout(() => {
      setStatusMessage("Binding hardware signature to account under 2-device cap...");
    }, 2400);

    // Step 3: Registration complete
    const t3 = setTimeout(() => {
      setStep("SUCCESS");
      setStatusMessage("Device registration completed!");
    }, 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <AppLayout pageTitle="Register Device">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/devices")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Devices</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col gap-6 text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#4C70A6] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4C70A6]/20">
            <Monitor className="w-7 h-7" />
          </div>

          <div>
            <Badge variant="info" className="mb-2">Electron Desktop Attestation</Badge>
            <h1 className="text-xl font-bold text-slate-900">Device Hardware Binding</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Native hardware fingerprinting via signed desktop launcher.
            </p>
          </div>

          {(step === "LAUNCHING" || step === "REGISTERING") && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#4C70A6] animate-spin" />
              <div className="text-sm font-bold text-slate-900">
                Your device is registering, please wait...
              </div>
              <div className="text-xs text-slate-500 font-mono bg-white px-3 py-1.5 rounded border border-slate-200 w-full text-center truncate">
                {statusMessage}
              </div>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-md p-6 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              <div>
                <div className="text-base font-bold text-emerald-900">Device Successfully Registered!</div>
                <p className="text-xs text-emerald-700 mt-1">
                  Hardware signature bound to your identity. Slot 2 of 2 activated.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="mt-2 bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                onClick={() => navigate("/devices")}
              >
                Return to My Devices
              </Button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hardware fingerprinting uses signed Electron main process APIs, not browser DOM fingerprints.</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
