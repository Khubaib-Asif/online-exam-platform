import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { WifiOff, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

export const ReconnectScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [reconnectSeconds, setReconnectSeconds] = useState(120);

  useEffect(() => {
    const t = setInterval(() => {
      setReconnectSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-md p-8 text-center flex flex-col items-center gap-5 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <WifiOff className="w-6 h-6" />
        </div>

        <div>
          <Badge variant="warning" className="mb-2">PAUSED_RECONNECT</Badge>
          <h1 className="text-xl font-bold text-white">Connection Lost to Server</h1>
          <p className="text-xs text-slate-400 mt-1">
            Exam timer is paused under server reconnect policy window.
          </p>
        </div>

        <div className="text-3xl font-bold font-mono text-[#38BDF8] bg-slate-900 px-6 py-3 rounded-md border border-slate-700">
          {reconnectSeconds}s
        </div>

        <p className="text-[11px] text-slate-400 font-mono">
          Attempting automatic reconnect using session proof nonce...
        </p>

        <div className="w-full flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8]"
            onClick={() => navigate(`/exam/${examId || "ex-401"}/live`)}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Retry Connection Now
          </Button>
        </div>
      </div>
    </div>
  );
};
