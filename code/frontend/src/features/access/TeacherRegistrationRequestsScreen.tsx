import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import {
  useGetTeacherPendingRequestsQuery,
  useDecideRegistrationRequestMutation,
} from "@/redux/services/registrationApi";

export interface TeacherPendingRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  requestedAt: string;
  status: "REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";
}

export const TeacherRegistrationRequestsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: requestsData, isLoading, refetch } = useGetTeacherPendingRequestsQuery();
  const [decideRegistrationRequest] = useDecideRegistrationRequestMutation();
  const [searchTerm, setSearchTerm] = useState("");

  const activeRequests: TeacherPendingRequest[] = (requestsData || []).map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.studentName,
    studentEmail: r.studentEmail,
    examId: r.examId,
    examTitle: r.examTitle,
    requestedAt: new Date(r.requestedAt).toLocaleString(),
    status: r.status as any,
  }));

  const handleDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
    try {
      await decideRegistrationRequest({ registrationId: id, decision }).unwrap();
      refetch();
    } catch (err: any) {
      console.error("Decision error:", err);
      alert(err.data?.message || "Failed to record decision.");
    }
  };

  const filteredRequests = activeRequests.filter(
    (req) =>
      req.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = activeRequests.filter(
    (r) => r.status === "REQUESTED" || r.status === "PENDING"
  ).length;
  const approvedCount = activeRequests.filter((r) => r.status === "APPROVED").length;

  return (
    <AppLayout pageTitle="Registration Requests Queue">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-[#4C70A6]" />
              <span>Teacher Registration Requests</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review and act on pending student registration requests for your approval-required examinations.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
          >
            Refresh
          </Button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search student or exam title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
            <Badge variant="warning">
              {pendingCount} Pending Review
            </Badge>
            <Badge variant="success">
              {approvedCount} Approved
            </Badge>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Requested Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                    Loading student registration requests...
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                    {activeRequests.length === 0
                      ? "No registration requests currently pending review."
                      : "No registration requests match your search filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => {
                  const isPending = req.status === "REQUESTED" || req.status === "PENDING";
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold text-slate-900">{req.studentName}</div>
                          <div className="text-xs text-slate-500 font-mono">{req.studentEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-800">{req.examTitle}</div>
                          <div className="text-xs text-slate-400 font-mono">{req.examId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {req.requestedAt}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "APPROVED"
                              ? "success"
                              : isPending
                              ? "warning"
                              : "error"
                          }
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleDecision(req.id, "APPROVED")}
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-red-700 border-red-200 hover:bg-red-50"
                              onClick={() => handleDecision(req.id, "REJECTED")}
                              icon={<XCircle className="w-3.5 h-3.5" />}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/registration-requests/${req.id}`)}
                              icon={<ChevronRight className="w-4 h-4" />}
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/registration-requests/${req.id}`)}
                            icon={<UserCheck className="w-3.5 h-3.5 text-slate-500" />}
                          >
                            View Detail
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};
