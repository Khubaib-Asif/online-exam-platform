import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Shield, Play, Download, ArrowLeft, MonitorCheck, ExternalLink } from "lucide-react";

export const DownloadDesktopAppScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunchApp = () => {
    setIsLaunching(true);
    // Simulate desktop app launch protocol
    setTimeout(() => {
      setIsLaunching(false);
      navigate(`/exam/${examId || "ex-401"}/entry`);
    }, 800);
  };

  return (
    <AppLayout pageTitle={`Launch Exam — ${examId || "ex-401"}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col gap-6 text-center items-center">
          {/* Brand Shield Logo */}
          <div className="w-14 h-14 rounded-2xl bg-[#4C70A6] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4C70A6]/20">
            <Shield className="w-8 h-8" />
          </div>

          <div>
            <Badge variant="success" className="mb-2">Registration Approved</Badge>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Launch Examination Session
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
              Live examinations require the signed desktop launcher shell (Electron) to enforce lockdown, attestation, and device security gates.
            </p>
          </div>

          {/* Launch Action */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold py-3.5 text-sm shadow-xs"
              onClick={handleLaunchApp}
              isLoading={isLaunching}
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Open in Desktop Launcher App
            </Button>

            <Button
              variant="secondary"
              size="md"
              className="w-full border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold"
              onClick={() => alert("Downloading signed Electron desktop application package...")}
              icon={<Download className="w-4 h-4 text-slate-600" />}
            >
              Download Signed Desktop App (.exe / .dmg)
            </Button>
          </div>

          <div className="w-full bg-slate-50 p-4 rounded-md border border-slate-200 text-left text-xs text-slate-600 flex items-start gap-3">
            <MonitorCheck className="w-5 h-5 text-[#4C70A6] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">Desktop App Requirement</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The Electron app will load the secure exam web URL over HTTPS, exchange single-use session tokens automatically behind the scenes, and execute hardware attestation gates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
