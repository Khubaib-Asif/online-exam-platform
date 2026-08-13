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
} from "lucide-react";

export interface TeacherPendingRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const mockRequests: TeacherPendingRequest[] = [
  {
    id: "req-101",
    studentId: "std-901",
    studentName: "Alex Rivera",
    studentEmail: "alex.rivera@university.edu",
    examId: "ex-401",
    examTitle: "CS 401 — Distributed Systems",
    requestedAt: "Aug 04, 2026 10:15 AM",
    status: "PENDING",
  },
  {
    id: "req-102",
    studentId: "std-902",
    studentName: "Michael Chen",
    studentEmail: "m.chen@university.edu",
    examId: "ex-401",
    examTitle: "CS 401 — Distributed Systems",
    requestedAt: "Aug 04, 2026 09:40 AM",
    status: "PENDING",
  },
  {
    id: "req-103",
    studentId: "std-903",
    studentName: "Sophia Patel",
    studentEmail: "spatel@university.edu",
    examId: "ex-305",
    examTitle: "PHYS 305 — Quantum Mechanics",
    requestedAt: "Aug 03, 2026 04:20 PM",
    status: "APPROVED",
  },
];

export const TeacherRegistrationRequestsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [requestsList, setRequestsList] = useState(mockRequests);

  const filteredRequests = requestsList.filter(
    (req) =>
      req.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuickDecision = (id: string, decision: "APPROVED" | "REJECTED") => {
    setRequestsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: decision } : r))
    );
  };

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
              {requestsList.filter((r) => r.status === "PENDING").length} Pending
            </Badge>
            <Badge variant="success">
              {requestsList.filter((r) => r.status === "APPROVED").length} Approved
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
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                    No registration requests match your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
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
                            : req.status === "PENDING"
                            ? "warning"
                            : "error"
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleQuickDecision(req.id, "APPROVED")}
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => handleQuickDecision(req.id, "REJECTED")}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};
