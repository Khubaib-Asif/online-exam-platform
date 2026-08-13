import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { ShieldCheck, Search, Lock, Terminal } from "lucide-react";

export interface AuditEventItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  targetRef: string;
  hash: string;
}

const mockAuditLogs: AuditEventItem[] = [
  {
    id: "evt-901",
    timestamp: "2026-08-04T11:40:00Z",
    actor: "sarah.jenkins@univ.edu",
    role: "TEACHER",
    action: "result.published",
    targetRef: "exam:ex-401:result-snapshot-v1",
    hash: "sha256:8f92a09...",
  },
  {
    id: "evt-900",
    timestamp: "2026-08-04T11:35:12Z",
    actor: "sarah.jenkins@univ.edu",
    role: "TEACHER",
    action: "grade.teacher.confirmed",
    targetRef: "attempt:sub-501:q-104",
    hash: "sha256:4a02c11...",
  },
  {
    id: "evt-899",
    timestamp: "2026-08-04T10:14:02Z",
    actor: "system-gate-worker",
    role: "SYSTEM",
    action: "security.gates.completed",
    targetRef: "attempt:sess-902:gate-pass",
    hash: "sha256:7b11c34...",
  },
  {
    id: "evt-898",
    timestamp: "2026-08-04T09:45:00Z",
    actor: "sarah.jenkins@univ.edu",
    role: "TEACHER",
    action: "exam.revision.published",
    targetRef: "exam:ex-401:rev-3",
    hash: "sha256:2d09e88...",
  },
];

export const AuditLogViewerScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = mockAuditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.targetRef.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Audit Log Viewer">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#4C70A6]" />
            <span>Platform Security & Audit Log</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Append-only, integrity-protected security and grading event ledger.
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex items-center justify-between">
          <div className="w-80">
            <Input
              placeholder="Search action, actor, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            Ledger Mode: APPEND_ONLY_PROTECTED
          </Badge>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID & Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action Event</TableHead>
                <TableHead>Target Reference</TableHead>
                <TableHead>Cryptographic Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <div className="font-mono font-bold text-xs text-slate-900">{log.id}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{log.timestamp}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{log.actor}</div>
                      <Badge variant="info" className="text-[10px] py-0">{log.role}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-900">
                    {log.action}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {log.targetRef}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-400">
                    {log.hash}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};
