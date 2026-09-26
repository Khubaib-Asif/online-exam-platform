import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  useGetSessionIntegrityDetailQuery,
  useRecordReconnectDecisionMutation,
} from "@/redux/services/proctoringApi";

export const ReconnectDecisionScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const targetSessionId = sessionId || "";

  const [reasonNote, setReasonNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<"GRANTED" | "TERMINATED" | null>(null);

  const { data: detailData, isLoading: isDetailLoading } = useGetSessionIntegrityDetailQuery(
    targetSessionId,
    { skip: !targetSessionId }
  );
  const [recordReconnectDecision, { isLoading: isSubmitting }] = useRecordReconnectDecisionMutation();

  const rawData = (detailData as any)?.data || detailData;
  const session = rawData?.session;

  const handleAction = async (granted: boolean) => {
    if (!targetSessionId) return;

    try {
      setErrorMessage(null);
      await recordReconnectDecision({
        sessionId: targetSessionId,
        granted,
        extensionSeconds: 300,
        reasonNote: reasonNote || (granted ? "Teacher approved reconnect extension" : "Teacher denied reconnect request"),
      }).unwrap();

      setDecisionOutcome(granted ? "GRANTED" : "TERMINATED");
    } catch (err: any) {
      console.error("Failed to record reconnect decision:", err);
      const msg = err.data?.error?.message || err.data?.message || err.message || "Failed to submit reconnect decision.";
      setErrorMessage(msg);
    }
  };

  return (
    <AppLayout pageTitle="Reconnect Decision">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/monitoring/${targetSessionId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Integrity Detail</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-5 text-center items-center">
          <RefreshCw className="w-10 h-10 text-amber-500" />
          <div>
            <Badge variant="warning" className="mb-2">
              {session?.status || "PAUSED_RECONNECT"}
            </Badge>
            <h1 className="text-lg font-bold text-slate-900">Teacher Reconnect Approval</h1>
            <p className="text-xs text-slate-500 mt-1">
              Candidate: <strong>{session?.studentName || "Student"}</strong> ({session?.studentEmail || ""})
            </p>
          </div>

          {errorMessage && (
            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {decisionOutcome ? (
            <div className="w-full bg-slate-50 p-5 rounded-md border border-slate-200 text-center flex flex-col items-center gap-2">
              {decisionOutcome === "GRANTED" ? (
                <>
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Reconnect Window Granted (+5 Minutes)
                  </h3>
                  <p className="text-xs text-slate-500">
                    The student may now resume their attempt from the secure desktop shell.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-red-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Attempt Terminated
                  </h3>
                  <p className="text-xs text-slate-500">
                    The session has been permanently marked as terminated.
                  </p>
                </>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/monitoring")}
              >
                Return to Live Monitor
              </Button>
            </div>
          ) : (
            <>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-left text-xs font-mono text-slate-700 flex flex-col gap-1.5">
                <div>Exam: {session?.examTitle || "Assessment"}</div>
                <div>Session ID: {session?.id || targetSessionId}</div>
                <div>Reconnect Attempts: {session?.reconnectCount ?? 1} / 3</div>
                <div>Current Risk Score: {session?.riskScore ?? 0} pts ({session?.riskLevel ?? "CLEAR"})</div>
              </div>

              <div className="w-full text-left">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Notes for Audit Trail
                </label>
                <textarea
                  rows={2}
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Optional audit justification..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 outline-none"
                />
              </div>

              <div className="w-full flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || isDetailLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleAction(true)}
                  icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                >
                  Grant Reconnect (+5m)
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={isSubmitting || isDetailLoading}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleAction(false)}
                  icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                >
                  Deny & Terminate
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
