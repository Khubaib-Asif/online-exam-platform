import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Activity,
  ArrowLeft,
  ShieldAlert,
  Video,
  Mic,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

export const SessionIntegrityDetailScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const session = {
    id: sessionId || "sess-902",
    studentName: "Michael Chen",
    studentEmail: "m.chen@university.edu",
    examTitle: "CS 401 — Distributed Systems",
    riskLevel: "HIGH" as const,
    sessionState: "REVIEW_REQUIRED" as const,
    signals: [
      { id: "sig-1", time: "10:14:02 AM", type: "FACE_UNAVAILABLE", severity: "HIGH", note: "Webcam feed lost candidate face for 8 seconds." },
      { id: "sig-2", time: "10:28:45 AM", type: "AUDIO_ANOMALY", severity: "MEDIUM", note: "Background voice detected above threshold." },
      { id: "sig-3", time: "10:35:10 AM", type: "WINDOW_FOCUS_LOST", severity: "LOW", note: "Lockdown focus lost for 400ms." },
    ],
  };

  return (
    <AppLayout pageTitle={`Integrity Detail — ${session.id}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
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
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="error">HIGH RISK SIGNAL</Badge>
                <span className="font-mono text-xs text-slate-400">ID: {session.id}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{session.studentName}</h1>
              <p className="text-xs text-slate-500">{session.studentEmail} • {session.examTitle}</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/monitoring/${session.id}/review`)}
              icon={<UserCheck className="w-4 h-4" />}
            >
              Record Teacher Decision
            </Button>
          </div>

          {/* Timeline of Integrity Signals */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recorded Evidence Timeline
            </h3>

            <div className="flex flex-col gap-2">
              {session.signals.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-md text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-slate-900">{sig.type}</span>
                      <span className="font-mono text-slate-400">{sig.time}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{sig.note}</p>
                  </div>
                  <Badge variant={sig.severity === "HIGH" ? "error" : "warning"} className="font-mono">
                    {sig.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
