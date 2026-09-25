import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Shield,
  Download,
  ArrowLeft,
  ExternalLink,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  ArrowRight,
  Info,
} from "lucide-react";
import { useGetExamDetailsQuery } from "@/redux/services/registrationApi";
import { useCreateLaunchTicketMutation } from "@/redux/services/gateApi";
import { nativeBridge } from "@/native-bridge/electronBridge";

export const DownloadDesktopAppScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const targetExamId = examId || "";

  const { data: examDetails } = useGetExamDetailsQuery(targetExamId, { skip: !targetExamId });
  const [createLaunchTicket, { isLoading: isGeneratingTicket }] = useCreateLaunchTicketMutation();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchAttempted, setLaunchAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wasRedirected = (location.state as any)?.requiresDesktopApp;

  const handleOpenInDesktopApp = async () => {
    setIsLaunching(true);
    setErrorMessage(null);
    try {
      // 1. Request one-time single-use launch ticket from backend
      const ticketRes = await createLaunchTicket(targetExamId).unwrap();
      const ticketString = ticketRes.launchTicket;

      // 2. Trigger native deep-link URI protocol for the Electron desktop shell
      const token = localStorage.getItem("accessToken") || "";
      const userPayload = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!) : null;
      const deepLinkUrl = `examapp://launch?examId=${targetExamId}&ticket=${encodeURIComponent(ticketString)}${token ? `&auth=${encodeURIComponent(token)}` : ""}${userPayload ? `&user=${encodeURIComponent(JSON.stringify(userPayload))}` : ""}`;
      
      // Dispatch deep link
      window.location.href = deepLinkUrl;
      setLaunchAttempted(true);
    } catch (err: any) {
      console.error("Failed to generate launch ticket:", err);
      setErrorMessage(
        err.data?.message || err.message || "Failed to generate exam launch ticket. Please verify registration status."
      );
    } finally {
      setIsLaunching(false);
    }
  };

  const handleProceedInsideElectron = () => {
    navigate(`/exam/${targetExamId}/gates`);
  };

  const handleDownloadApp = () => {
    const blob = new Blob(
      [
        "Online Exam Platform — Secure Desktop Lockdown Shell (Signed Executable Package)\n" +
          "Run 'npm start' or 'npm run dev' inside code/desktop to launch the desktop shell."
      ],
      { type: "application/octet-stream" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "OnlineExamLauncher-Setup.exe";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout pageTitle={`Launch Exam — ${examDetails?.title || targetExamId}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/exam/${targetExamId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam Details</span>
          </button>
        </div>

        {/* Warning if redirected from direct browser attempt */}
        {wasRedirected && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <span className="font-bold block">Desktop Lockdown App Required</span>
              <p className="mt-0.5 leading-relaxed">
                Exam security gates and live attempts cannot be accessed in a standard web browser. Please launch the exam using the signed Desktop Launcher app.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col gap-6 text-center items-center">
          {/* Brand Shield Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[#4C70A6] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4C70A6]/20">
            <Shield className="w-9 h-9" />
          </div>

          <div>
            <Badge variant="success" className="mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              Registration Approved
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {examDetails?.title || "Launch Examination Session"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed mx-auto">
              Live examinations require the signed desktop lockdown shell to guarantee hardware attestation, fullscreen kiosk container, and strict single-display integrity.
            </p>
          </div>

          {errorMessage && (
            <div className="w-full p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* If already running inside Electron */}
          {nativeBridge.isElectron ? (
            <div className="w-full flex flex-col gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-800 flex items-center justify-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">Desktop Lockdown Client Detected</span>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold py-3.5 text-sm shadow-xs"
                onClick={handleProceedInsideElectron}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Pre-Exam Security Gates
              </Button>
            </div>
          ) : (
            /* In standard web browser */
            <div className="w-full flex flex-col gap-3 mt-1">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold py-3.5 text-sm shadow-xs"
                onClick={handleOpenInDesktopApp}
                isLoading={isLaunching || isGeneratingTicket}
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Launch Desktop App
              </Button>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <p className="text-[11px] text-slate-500 text-center">
                  Don't have the desktop client installed?
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 text-xs"
                  onClick={handleDownloadApp}
                  icon={<Download className="w-4 h-4 text-slate-600" />}
                >
                  Download Signed Desktop App (.exe)
                </Button>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="w-full bg-slate-50 p-4 rounded-md border border-slate-200 text-left text-xs text-slate-600 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#4C70A6] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">Strict Hardware Attestation & Lockdown</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Opening the launcher will verify single-display configuration, engage kiosk mode, and execute the 6 server-evaluated security gates before session entry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
