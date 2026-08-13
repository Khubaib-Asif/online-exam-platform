import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { FileCheck, Search, Eye, Filter, Send, Sparkles } from "lucide-react";

export interface GradingQueueItem {
  submissionId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  objectiveScore: number;
  objectiveTotal: number;
  subjectiveStatus: "AUTO_GRADED" | "PENDING_REVIEW" | "CONFIRMED";
  submittedAt: string;
}

const mockSubmissions: GradingQueueItem[] = [
  {
    submissionId: "sub-501",
    studentName: "Alex Rivera",
    studentEmail: "alex.rivera@university.edu",
    examId: "ex-401",
    examTitle: "CS 401 — Distributed Systems",
    objectiveScore: 40,
    objectiveTotal: 40,
    subjectiveStatus: "PENDING_REVIEW",
    submittedAt: "Aug 04, 2026 11:40 AM",
  },
  {
    submissionId: "sub-502",
    studentName: "Michael Chen",
    studentEmail: "m.chen@university.edu",
    examId: "ex-401",
    examTitle: "CS 401 — Distributed Systems",
    objectiveScore: 35,
    objectiveTotal: 40,
    subjectiveStatus: "CONFIRMED",
    submittedAt: "Aug 04, 2026 11:32 AM",
  },
  {
    submissionId: "sub-503",
    studentName: "Sophia Patel",
    studentEmail: "spatel@university.edu",
    examId: "ex-202",
    examTitle: "MATH 202 — Advanced Calculus",
    objectiveScore: 50,
    objectiveTotal: 50,
    subjectiveStatus: "AUTO_GRADED",
    submittedAt: "Aug 03, 2026 03:15 PM",
  },
];

export const GradingQueueScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = mockSubmissions.filter((sub) => {
    const matchesSearch =
      sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.examTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || sub.subjectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout pageTitle="Grading Queue">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-[#4C70A6]" />
              <span>Teacher Grading Queue</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review AI-assisted subjective grading suggestions, confirm final marks, and publish result snapshots.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/grading/publish/ex-401")}
            icon={<Send className="w-4 h-4" />}
          >
            Publish Result Snapshots
          </Button>
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
            <span className="text-xs font-semibold text-slate-600 shrink-0">Filter:</span>
            {["ALL", "PENDING_REVIEW", "CONFIRMED", "AUTO_GRADED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Objective Score</TableHead>
                <TableHead>Subjective Status</TableHead>
                <TableHead>Submitted Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.submissionId}>
                  <TableCell>
                    <div>
                      <div className="font-semibold text-slate-900">{sub.studentName}</div>
                      <div className="text-xs text-slate-400 font-mono">{sub.studentEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-xs text-slate-800">
                    {sub.examTitle}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-900">
                    {sub.objectiveScore} / {sub.objectiveTotal} pts
                  </TableCell>
                  <TableCell>
                    {sub.subjectiveStatus === "PENDING_REVIEW" ? (
                      <Badge variant="warning" className="flex items-center gap-1 w-fit">
                        <Sparkles className="w-3 h-3 text-amber-600" /> AI Suggestions Ready
                      </Badge>
                    ) : sub.subjectiveStatus === "CONFIRMED" ? (
                      <Badge variant="success">Confirmed</Badge>
                    ) : (
                      <Badge variant="info">Auto-Graded</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {sub.submittedAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/grading/${sub.submissionId}`)}
                      icon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Review Grade
                    </Button>
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
