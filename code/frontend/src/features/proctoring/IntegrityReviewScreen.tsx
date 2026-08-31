import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { UserCheck, CheckCircle, XCircle, ArrowLeft, ShieldCheck, HelpCircle } from "lucide-react";

export const IntegrityReviewScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [decision, setDecision] = useState<"CLEARED" | "FLAGGED" | "INCONCLUSIVE" | "PENDING">("PENDING");
  const [reviewNotes, setReviewNotes] = useState("");

  const handleRecord = (outcome: "CLEARED" | "FLAGGED" | "INCONCLUSIVE") => {
    setDecision(outcome);
  };

  return (
    <AppLayout pageTitle={`Integrity Review — ${sessionId || "sess-902"}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/monitoring")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Monitor</span>
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
                Session ID: <span className="font-mono font-bold text-slate-800">{sessionId || "sess-902"}</span>
              </p>
            </div>
            <Badge variant="warning">{decision}</Badge>
          </div>

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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={() => handleRecord("CLEARED")}
                >
                  Clear Session
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                  onClick={() => handleRecord("FLAGGED")}
                >
                  Flag Violation
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="text-slate-600 text-xs"
                  onClick={() => handleRecord("INCONCLUSIVE")}
                >
                  Inconclusive
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-md border border-slate-200 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Auditable Review Decision Saved: {decision}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/monitoring")}
              >
                Return to Monitor
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
