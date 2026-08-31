import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { AlertOctagon, ArrowLeft } from "lucide-react";

export const AttemptTerminatedScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-md p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-red-950/80 text-red-500 flex items-center justify-center border border-red-800/50">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div>
          <Badge variant="error" className="mb-2">TERMINATED</Badge>
          <h1 className="text-xl font-bold text-white">Exam Attempt Terminated</h1>
          <p className="text-xs text-slate-400 mt-1">
            Your attempt was terminated by server session policy.
          </p>
        </div>

        <div className="w-full bg-slate-950 p-4 rounded-md border border-slate-800 text-left text-xs text-slate-400 font-mono flex flex-col gap-2">
          <div className="font-bold text-red-400">Termination Reason: RECONNECT_WINDOW_EXHAUSTED</div>
          <div>Server Deadline: Aug 04, 2026 11:35:00</div>
          <div>Answers Saved: 3 / 45 Questions</div>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
          onClick={() => navigate("/dashboard")}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to Student Dashboard
        </Button>
      </div>
    </div>
  );
};
