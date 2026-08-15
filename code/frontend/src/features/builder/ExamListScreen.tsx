import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Clock,
  Globe,
  Settings,
  Eye,
  Send,
  Share2,
} from "lucide-react";

export interface TeacherExamItem {
  id: string;
  title: string;
  revision: number;
  status: "DRAFT" | "VALIDATED" | "PUBLISHED" | "UNPUBLISHED";
  timingMode: "WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED";
  durationMinutes: number;
  sectionsCount: number;
  totalQuestions: number;
  policy: "PUBLIC" | "INVITATION_ONLY" | "APPROVAL_REQUIRED";
  updatedAt: string;
}

const mockExams: TeacherExamItem[] = [
  {
    id: "ex-401",
    title: "CS 401 — Distributed Systems & Architecture",
    revision: 3,
    status: "PUBLISHED",
    timingMode: "SECTION_TIMED",
    durationMinutes: 120,
    sectionsCount: 3,
    totalQuestions: 45,
    policy: "APPROVAL_REQUIRED",
    updatedAt: "Aug 02, 2026",
  },
  {
    id: "ex-202",
    title: "MATH 202 — Advanced Multivariable Calculus",
    revision: 1,
    status: "PUBLISHED",
    timingMode: "WHOLE_PAPER",
    durationMinutes: 90,
    sectionsCount: 2,
    totalQuestions: 30,
    policy: "PUBLIC",
    updatedAt: "Jul 25, 2026",
  },
  {
    id: "ex-305",
    title: "PHYS 305 — Quantum Mechanics Fundamentals",
    revision: 2,
    status: "DRAFT",
    timingMode: "QUESTION_TIMED",
    durationMinutes: 150,
    sectionsCount: 4,
    totalQuestions: 50,
    policy: "INVITATION_ONLY",
    updatedAt: "Jul 29, 2026",
  },
];

export const ExamListScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredExams = mockExams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: TeacherExamItem["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge variant="success">Published</Badge>;
      case "DRAFT":
        return <Badge variant="warning">Draft</Badge>;
      case "VALIDATED":
        return <Badge variant="info">Validated</Badge>;
      case "UNPUBLISHED":
        return <Badge variant="default">Unpublished</Badge>;
    }
  };

  return (
    <AppLayout pageTitle="Teacher Exams">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#4C70A6]" />
              <span>Exam Builder & Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Compose sections, configure timing and access policies, and publish immutable revisions.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/builder/new")}
            icon={<Plus className="w-4 h-4" />}
          >
            Create New Exam
          </Button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search exam title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 shrink-0">Status:</span>
            {["ALL", "DRAFT", "PUBLISHED", "UNPUBLISHED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title & ID</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timing Mode</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    No examinations found matching your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">{exam.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {exam.id} • {exam.sectionsCount} Sections • {exam.totalQuestions} Questions
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700 font-bold">
                      rev {exam.revision}
                    </TableCell>
                    <TableCell>{getStatusBadge(exam.status)}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {exam.timingMode} ({exam.durationMinutes}m)
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{exam.policy.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/builder/${exam.id}`)}
                          icon={<Settings className="w-3.5 h-3.5 text-slate-600" />}
                          title="Compose Sections & Settings"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/builder/${exam.id}/preview`)}
                          icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                          title="Preview Exam Paper"
                        />
                        {exam.status === "PUBLISHED" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/builder/${exam.id}/distribution`)}
                            icon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
                            title="Distribution Status"
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/builder/${exam.id}/publish`)}
                            icon={<Send className="w-3.5 h-3.5 text-[#4C70A6]" />}
                            title="Publish Exam"
                          />
                        )}
                      </div>
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
