import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { AlertOctagon, ArrowLeft, Home, LogOut } from "lucide-react";
import { nativeBridge } from "@/native-bridge/electronBridge";

export const AttemptTerminatedScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetExamId = examId || "";

  const handleExit = () => {
    if (nativeBridge.isElectron) {
      nativeBridge.closeExamShell?.();
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-md p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-red-950/80 text-red-500 flex items-center justify-center border border-red-800/50">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div>
          <Badge variant="danger" className="mb-2">TERMINATED</Badge>
          <h1 className="text-xl font-bold text-white">Exam Attempt Terminated</h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Your exam session was terminated under authoritative session security policy.
          </p>
        </div>

        <div className="w-full bg-slate-950 p-4 rounded-md border border-slate-800 text-left text-xs text-slate-400 font-mono flex flex-col gap-2">
          <div className="text-red-400 font-bold">
            Status: <span className="text-white">TERMINATED</span>
          </div>
          <div>Policy Rule: Reconnect window exceeded or integrity threshold reached.</div>
          <div>All answers recorded prior to termination remain durably stored in PostgreSQL.</div>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          {nativeBridge.isElectron ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
              onClick={handleExit}
              icon={<LogOut className="w-4 h-4" />}
            >
              Exit Exam Shell
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
              onClick={() => navigate("/dashboard")}
              icon={<Home className="w-4 h-4" />}
            >
              Return to Student Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
