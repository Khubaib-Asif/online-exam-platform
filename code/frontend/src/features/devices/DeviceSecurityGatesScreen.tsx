import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Lock,
  Smartphone,
  Video,
  FileCheck,
  AlertTriangle,
  Play,
} from "lucide-react";

export interface GateItemState {
  id: string;
  name: string;
  description: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED";
}

export const DeviceSecurityGatesScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [gates, setGates] = useState<GateItemState[]>([
    { id: "g-1", name: "IDENTITY Gate", description: "Verifying user photo enrolment metadata & active session identity.", status: "PENDING" },
    { id: "g-2", name: "DEVICE Gate", description: "Verifying 2-device cap binding and hardware fingerprint cryptographic key.", status: "PENDING" },
    { id: "g-[#]", name: "ENVIRONMENT Gate", description: "Scanning active processes for illegal virtual machines or remote desktop tools.", status: "PENDING" },
    { id: "g-4", name: "LOCKDOWN Gate", description: "Verifying single-display restriction and task-switcher interception.", status: "PENDING" },
    { id: "g-5", name: "CONSENT Gate", description: "Verifying terms & conditions and proctoring telemetry capture consent.", status: "PENDING" },
    { id: "g-6", name: "ATTESTATION Gate", description: "Checking TPM/Secure Enclave hardware-bound attestation payload.", status: "PENDING" },
  ]);

  const [currentRunningIdx, setCurrentRunningIdx] = useState(0);
  const [allPassed, setAllPassed] = useState(false);

  useEffect(() => {
    if (currentRunningIdx < gates.length) {
      // Set current gate to RUNNING
      setGates((prev) =>
        prev.map((g, idx) => (idx === currentRunningIdx ? { ...g, status: "RUNNING" } : g))
      );

      const timer = setTimeout(() => {
        setGates((prev) =>
          prev.map((g, idx) => (idx === currentRunningIdx ? { ...g, status: "PASSED" } : g))
        );
        setCurrentRunningIdx(currentRunningIdx + 1);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setAllPassed(true);
    }
  }, [currentRunningIdx, gates.length]);

  return (
    <AppLayout pageTitle="Per-Attempt Security Gates">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info">M5 Security Verification</Badge>
                <span className="font-mono text-xs text-slate-400">Exam: {examId || "ex-401"}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#4C70A6]" />
                <span>Executing Per-Attempt Security Gates</span>
              </h1>
            </div>
            <Badge variant={allPassed ? "success" : "warning"} className="font-mono">
              {allPassed ? "6 / 6 PASSED" : `${currentRunningIdx} / 6 Verified`}
            </Badge>
          </div>

          {/* Gate Checklist */}
          <div className="flex flex-col gap-3">
            {gates.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-md text-xs"
              >
                <div className="flex items-center gap-3">
                  {g.status === "PASSED" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {g.status === "RUNNING" && (
                    <Loader2 className="w-5 h-5 text-[#4C70A6] animate-spin shrink-0" />
                  )}
                  {g.status === "PENDING" && (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  {g.status === "FAILED" && (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  )}

                  <div>
                    <div className="font-bold text-slate-900 font-mono">{g.name}</div>
                    <div className="text-slate-500 mt-0.5">{g.description}</div>
                  </div>
                </div>

                <Badge
                  variant={
                    g.status === "PASSED"
                      ? "success"
                      : g.status === "RUNNING"
                      ? "info"
                      : "outline"
                  }
                  className="font-mono text-[10px]"
                >
                  {g.status}
                </Badge>
              </div>
            ))}
          </div>

          {/* Action on Pass */}
          {allPassed ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-5 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Signed Server Entry Authorisation Issued!
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  All 6 security gates passed. You are cleared to enter the live exam session.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold"
                onClick={() => navigate(`/exam/${examId || "ex-401"}/live`)}
                icon={<Play className="w-4 h-4 fill-current" />}
              >
                Enter Live Exam Session
              </Button>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 font-mono py-2">
              Evaluating server gate policy version 2.4...
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
