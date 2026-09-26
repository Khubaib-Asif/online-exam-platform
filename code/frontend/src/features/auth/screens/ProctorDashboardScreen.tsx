import React from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Activity, ShieldAlert, Eye, RefreshCw, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGetLiveSessionsQuery } from "@/redux/services/proctoringApi";

export const ProctorDashboardScreen: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useGetLiveSessionsQuery(undefined, {
    pollingInterval: 5000,
  });

  const rawSessions = (data as any)?.data?.sessions || data?.sessions || [];
  const statsData = (data as any)?.data?.stats || data?.stats || {
    totalActive: 0,
    clearCount: 0,
    reconnectingCount: 0,
    reviewRequiredCount: 0,
  };

  const flaggedSessions = rawSessions.filter(
    (s: any) => s.sessionState === "REVIEW_REQUIRED" || s.riskLevel === "HIGH" || s.openFlagsCount > 0
  );

  const stats = [
    { label: "Active Live Sessions", value: statsData.totalActive },
    { label: "Clear Integrity", value: statsData.clearCount },
    { label: "Reconnecting", value: statsData.reconnectingCount },
    { label: "Review Required", value: statsData.reviewRequiredCount },
  ];

  return (
    <AppLayout pageTitle="Proctor Dashboard">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Proctoring Overview
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time telemetry monitoring, lockdown attestation status, and integrity flag queue.
            </p>
          </div>
          <Badge variant="info" icon={<Activity className="w-3.5 h-3.5" />}>
            Live Monitoring Active
          </Badge>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs text-left"
            >
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Live Session Alert Queue */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Active Security Flags ({flaggedSessions.length})</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => refetch()}
            >
              Refresh Stream
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {flaggedSessions.length > 0 ? (
              flaggedSessions.map((s: any) => (
                <div
                  key={s.sessionId}
                  className="flex items-center justify-between p-4 bg-amber-50/40 border border-amber-200/80 rounded-md"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-sm text-slate-900">
                      Integrity Anomaly: {s.studentName} ({s.riskScore} pts)
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Session: {s.examTitle} • Status: {s.sessionState}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/monitoring/${s.sessionId}`)}
                  >
                    Inspect Telemetry
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-md text-xs text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <span>No active security violations or flagged sessions.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

