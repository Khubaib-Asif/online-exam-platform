import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { ShieldCheck, Search, Lock, Terminal, RefreshCw, AlertCircle } from "lucide-react";
import { useGetAuditLogsQuery, type AuditEventItem } from "@redux/services/gradingApi";

export type { AuditEventItem };

export const AuditLogViewerScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: auditData,
    isLoading,
    isError,
    refetch,
  } = useGetAuditLogsQuery({
    search: searchTerm.trim() ? searchTerm.trim() : undefined,
    limit: 100,
  });

  const logs = auditData?.events || [];

  return (
    <AppLayout pageTitle="Audit Log Viewer">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#4C70A6]" />
              <span>Platform Security & Audit Log</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Append-only, cryptographic hash-chained security, grading, and authentication event ledger.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Ledger
          </Button>
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
            Ledger Mode: APPEND_ONLY_PROTECTED ({auditData?.total || 0} Records)
          </Badge>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-3 shadow-2xs">
            <RefreshCw className="w-8 h-8 text-[#4C70A6] animate-spin" />
            <p className="text-xs font-medium text-slate-600">Verifying cryptographic hash chain & loading ledger...</p>
          </div>
        ) : isError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-md p-6 text-center text-xs text-rose-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Failed to load audit trail records.</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No Audit Events Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              As security, gate, grading, and publication actions occur across the platform, immutable entries will populate here.
            </p>
          </div>
        ) : (
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
                {logs.map((log: AuditEventItem) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono font-bold text-xs text-slate-900">{log.id.slice(0, 8)}...</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
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
        )}
      </div>
    </AppLayout>
  );
};

