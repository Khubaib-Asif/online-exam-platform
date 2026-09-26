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
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useGetSessionIntegrityDetailQuery } from "@/redux/services/proctoringApi";

export const SessionIntegrityDetailScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const targetSessionId = sessionId || "";

  const { data, isLoading, isError, refetch } = useGetSessionIntegrityDetailQuery(
    targetSessionId,
    { skip: !targetSessionId }
  );

  const rawData = (data as any)?.data || data;
  const session = rawData?.session;
  const signals = rawData?.signals || [];
  const flags = rawData?.flags || [];

  if (isLoading) {
    return (
      <AppLayout pageTitle="Loading Integrity Detail">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#4C70A6]" />
          <p className="text-xs text-slate-500 font-mono">Loading telemetry and integrity timeline...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !session) {
    return (
      <AppLayout pageTitle="Session Not Found">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-md p-6 text-center flex flex-col items-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h2 className="text-base font-bold text-slate-900">Session Integrity Records Unavailable</h2>
          <p className="text-xs text-slate-500">
            Could not retrieve integrity details for this session ID, or you do not have permission to review it.
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate("/monitoring")}>
            Return to Live Monitor
          </Button>
        </div>
      </AppLayout>
    );
  }

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
                <Badge
                  variant={
                    session.riskLevel === "CLEAR"
                      ? "success"
                      : session.riskLevel === "HIGH"
                      ? "error"
                      : "warning"
                  }
                >
                  {session.riskLevel} RISK ({session.riskScore} PTS)
                </Badge>
                <span className="font-mono text-xs text-slate-400">ID: {session.id}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{session.studentName}</h1>
              <p className="text-xs text-slate-500">{session.studentEmail} • {session.examTitle}</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
              onClick={() => navigate(`/monitoring/${session.id}/review`)}
              icon={<UserCheck className="w-4 h-4" />}
            >
              Record Teacher Decision
            </Button>
          </div>

          {/* Timeline of Integrity Signals */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recorded Evidence Timeline ({signals.length})
              </h3>
              <button
                onClick={() => refetch()}
                className="text-xs text-[#4C70A6] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Feed</span>
              </button>
            </div>

            {signals.length > 0 ? (
              <div className="flex flex-col gap-2">
                {signals.map((sig: any) => (
                  <div
                    key={sig.id}
                    className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-md text-xs"
                  >
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        sig.severity === "HIGH"
                          ? "text-red-500"
                          : sig.severity === "MEDIUM"
                          ? "text-amber-500"
                          : "text-blue-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-slate-900">{sig.type}</span>
                        <span className="font-mono text-slate-400">{sig.time}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{sig.note}</p>
                    </div>
                    <Badge variant={sig.severity === "HIGH" ? "error" : "warning"} className="font-mono">
                      +{sig.riskDelta} PTS
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-md text-center text-xs text-slate-500">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No security violations or telemetry anomalies recorded for this attempt.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
