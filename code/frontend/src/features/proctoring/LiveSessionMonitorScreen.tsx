import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import {
  Activity,
  Search,
  Eye,
  ShieldAlert,
  Video,
  Mic,
  Wifi,
  Filter,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  useGetLiveSessionsQuery,
  type LiveSessionItem,
} from "@/redux/services/proctoringApi";

export const LiveSessionMonitorScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  const { data, isLoading, isFetching, refetch } = useGetLiveSessionsQuery(
    { search: searchTerm, riskFilter },
    { pollingInterval: 5000 }
  );

  const rawSessions = (data as any)?.data?.sessions || data?.sessions || [];
  const stats = (data as any)?.data?.stats || data?.stats || {
    totalActive: 0,
    clearCount: 0,
    reconnectingCount: 0,
    reviewRequiredCount: 0,
  };

  const filteredSessions: LiveSessionItem[] = rawSessions;

  const getRiskBadge = (risk: LiveSessionItem["riskLevel"]) => {
    switch (risk) {
      case "CLEAR":
        return <Badge variant="success">CLEAR</Badge>;
      case "LOW":
        return <Badge variant="info">LOW RISK</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">MEDIUM RISK</Badge>;
      case "HIGH":
        return <Badge variant="error">HIGH RISK</Badge>;
    }
  };

  return (
    <AppLayout pageTitle="Live Session Monitor">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#4C70A6]" />
              <span>Live Exam Session Monitor</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring of ongoing attempts, integrity signals, and video/telemetry health.
            </p>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-slate-900">{stats.totalActive}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Active Attempts</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-emerald-600">{stats.clearCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Clear Integrity</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-amber-600">{stats.reconnectingCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Reconnecting</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-red-600">{stats.reviewRequiredCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Review Required</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search student or exam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 shrink-0">Risk Filter:</span>
            {["ALL", "CLEAR", "LOW", "MEDIUM", "HIGH"].map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  riskFilter === r
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Live Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Session State</TableHead>
                <TableHead>Integrity Signal</TableHead>
                <TableHead>Hardware Stream</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.length > 0 ? (
                filteredSessions.map((s) => (
                  <TableRow key={s.sessionId}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-slate-900">{s.studentName}</div>
                        <div className="text-xs text-slate-400 font-mono">{s.studentEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-slate-800">
                      {s.examTitle}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.sessionState === "ACTIVE"
                            ? "success"
                            : s.sessionState === "RECONNECTING"
                            ? "warning"
                            : "error"
                        }
                      >
                        {s.sessionState}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getRiskBadge(s.riskLevel)}
                        <span className="font-mono text-[11px] text-slate-400">
                          ({s.riskScore} pts)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1">
                          <Video className={`w-3.5 h-3.5 ${s.cameraStatus === "OK" ? "text-emerald-600" : "text-amber-500"}`} />
                          {s.cameraStatus}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mic className={`w-3.5 h-3.5 ${s.micStatus === "OK" ? "text-emerald-600" : "text-red-500"}`} />
                          {s.micStatus}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/monitoring/${s.sessionId}`)}
                        icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                      >
                        View Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                    No active student exam sessions matching the filter criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};
