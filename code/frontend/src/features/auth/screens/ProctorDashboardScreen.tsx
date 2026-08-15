import React from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Activity, ShieldAlert, Eye, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ProctorDashboardScreen: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { label: "Active Live Sessions", value: 3 },
    { label: "Students Online", value: 142 },
    { label: "Flagged Events", value: 2 },
    { label: "Pending Reviews", value: 1 },
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
              <span>Active Security Flags</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Stream
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 bg-amber-50/40 border border-amber-200/80 rounded-md">
              <div className="flex flex-col text-left">
                <span className="font-semibold text-sm text-slate-900">
                  Multiple Displays Detected (Candidate ID: STU-2026-089)
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Session: CS401-FINAL • Timestamp: 11:24:02 AM
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => navigate("/monitoring")}
              >
                Inspect Telemetry
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
