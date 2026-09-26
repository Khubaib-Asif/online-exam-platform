import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { WifiOff, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useResumeSessionMutation, usePauseReconnectMutation } from "@/redux/services/sessionApi";

export const ReconnectScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetExamId = examId || "";
  const sessionId = searchParams.get("sessionId") || "";

  const [resumeSession, { isLoading: isResuming }] = useResumeSessionMutation();
  const [pauseReconnect] = usePauseReconnectMutation();

  const [reconnectSeconds, setReconnectSeconds] = useState(60);
  const [reconnectCount, setReconnectCount] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trigger pause-reconnect on mount to register reconnect attempt with server
  useEffect(() => {
    if (!sessionId) return;

    const registerPause = async () => {
      try {
        const res = await pauseReconnect(sessionId).unwrap();
        if (res.status === "TERMINATED") {
          navigate(`/exam/${targetExamId}/terminated`);
        } else if (res.reconnectDeadline) {
          const rem = Math.max(0, Math.floor((new Date(res.reconnectDeadline).getTime() - Date.now()) / 1000));
          setReconnectSeconds(rem);
          setReconnectCount(res.reconnectCount);
        }
      } catch (err) {
        console.warn("Pause reconnect error:", err);
      }
    };

    registerPause();
  }, [sessionId, pauseReconnect, targetExamId, navigate]);

  // Master 1-second countdown
  useEffect(() => {
    const t = setInterval(() => {
      setReconnectSeconds((prev) => {
        if (prev <= 1) {
          navigate(`/exam/${targetExamId}/terminated`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [targetExamId, navigate]);

  // Handle Manual or Automatic Resume
  const handleResume = async () => {
    if (!sessionId || isResuming) return;
    try {
      setErrorMessage(null);
      const projection = await resumeSession(sessionId).unwrap();
      if (projection.status === "TERMINATED") {
        navigate(`/exam/${targetExamId}/terminated`);
      } else {
        navigate(`/exam/${targetExamId}/live`);
      }
    } catch (err: any) {
      console.error("Resume session error:", err);
      const msg = err.data?.error?.message || err.data?.message || err.message || "Failed to resume exam session.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-md p-8 text-center flex flex-col items-center gap-5 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <WifiOff className="w-6 h-6" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="warning">PAUSED_RECONNECT</Badge>
            <span className="text-[11px] font-mono text-slate-400">
              Attempt {reconnectCount} of 3
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">Connection Lost to Server</h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Exam timer is paused under the server reconnect window. Re-establishing secure channel...
          </p>
        </div>

        {errorMessage && (
          <div className="w-full p-3 bg-red-950/80 border border-red-800 rounded text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="text-3xl font-bold font-mono text-[#38BDF8] bg-slate-900 px-6 py-3 rounded-md border border-slate-700 shadow-inner">
          {reconnectSeconds}s
        </div>

        <p className="text-[11px] text-slate-400 font-mono">
          Automatic reconnection bounded by server security policy (max 60s).
        </p>

        <div className="w-full flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            disabled={isResuming}
            className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
            onClick={handleResume}
            icon={isResuming ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            {isResuming ? "Resuming Session..." : "Retry Connection Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};
