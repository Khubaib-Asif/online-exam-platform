import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  HelpCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useRecordReviewDecisionMutation } from "@/redux/services/proctoringApi";

export const IntegrityReviewScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const targetSessionId = sessionId || "";

  const [decision, setDecision] = useState<"CLEARED" | "FLAGGED" | "INCONCLUSIVE" | "PENDING">("PENDING");
  const [reviewNotes, setReviewNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [recordReviewDecision, { isLoading }] = useRecordReviewDecisionMutation();

  const handleRecord = async (outcome: "CLEARED" | "FLAGGED" | "INCONCLUSIVE") => {
    if (!targetSessionId) return;

    try {
      setErrorMessage(null);
      await recordReviewDecision({
        sessionId: targetSessionId,
        decision: outcome,
        reviewNote: reviewNotes,
      }).unwrap();
      setDecision(outcome);
    } catch (err: any) {
      console.error("Failed to record review decision:", err);
      const msg = err.data?.error?.message || err.data?.message || err.message || "Failed to record review decision.";
      setErrorMessage(msg);
    }
  };

  return (
    <AppLayout pageTitle={`Integrity Review — ${targetSessionId}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/monitoring/${targetSessionId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Integrity Detail</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#4C70A6]" />
                <span>Integrity Review Decision</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Session ID: <span className="font-mono font-bold text-slate-800">{targetSessionId}</span>
              </p>
            </div>
            <Badge variant={decision === "CLEARED" ? "success" : decision === "FLAGGED" ? "error" : "warning"}>
              {decision}
            </Badge>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {decision === "PENDING" ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Review Notes & Rationale
                </label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record auditable notes regarding telemetry evidence..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={() => handleRecord("CLEARED")}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Clear Session"}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={isLoading}
                  className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  onClick={() => handleRecord("FLAGGED")}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Flag Violation"}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={isLoading}
                  className="text-slate-600 text-xs"
                  onClick={() => handleRecord("INCONCLUSIVE")}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Inconclusive"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-md border border-slate-200 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Auditable Review Decision Saved: {decision}
              </h3>
              <p className="text-xs text-slate-500">
                An immutable audit event has been recorded with your reviewer ID and timestamp.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/monitoring")}
              >
                Return to Live Monitor
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
