import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Modal } from "@components/ui/Modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Settings,
  Eye,
  Send,
  Share2,
} from "lucide-react";
import { useGetTeacherExamsQuery, useCreateExamMutation } from "@/redux/services/examBuilderApi";

export interface TeacherExamItem {
  id: string;
  title: string;
  revision: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  timingMode: "WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED";
  durationMinutes: number;
  totalQuestions: number;
  policy: "PUBLIC" | "INVITATION_ONLY" | "APPROVAL_REQUIRED";
  updatedAt: string;
}

export const ExamListScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: apiExams, refetch: refetchExams } = useGetTeacherExamsQuery();
  const [createExamApi, { isLoading: isCreating }] = useCreateExamMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(
    () => new URLSearchParams(location.search).get("create") === "true"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessPolicy, setAccessPolicy] = useState<"PUBLIC" | "INVITATION_ONLY" | "APPROVAL_REQUIRED">("INVITATION_ONLY");
  const [timingMode, setTimingMode] = useState<"WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED">("WHOLE_PAPER");
  const [durationMinutes, setDurationMinutes] = useState<number>(120);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await createExamApi({
        title: title.trim(),
        description: description.trim() || undefined,
        accessPolicy,
        timingMode,
        paperDurationSeconds: durationMinutes * 60,
      }).unwrap();

      const createdId = res.data?.id || res.id;
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      refetchExams();
      navigate(`/builder/${createdId}`);
    } catch (err) {
      console.error("Create exam error:", err);
      alert("Failed to create draft exam. Please check input values.");
    }
  };

  const examsList: TeacherExamItem[] = (apiExams || []).map((e) => ({
    id: e.id,
    title: e.title,
    revision: e.revisionNumber,
    status: e.status as any,
    timingMode: (e.timingMode || "WHOLE_PAPER") as any,
    durationMinutes: e.durationMinutes || 120,
    totalQuestions: e.totalQuestions || 0,
    policy: (e.accessPolicy || "INVITATION_ONLY") as any,
    updatedAt: new Date(e.updatedAt).toLocaleDateString(),
  }));

  const filteredExams = examsList.filter((exam) => {
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
      case "CLOSED":
        return <Badge variant="default">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
              Compose sections, configure timing & access policies, and publish immutable exam papers.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create New Exam
          </Button>
        </div>

        {/* Modal: Create Draft Exam */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Examination Draft"
        >
          <form onSubmit={handleCreateExam} className="flex flex-col gap-4">
            <Input
              label="Exam Title *"
              placeholder="e.g. CS 401 — Distributed Systems Midterm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Comprehensive examination covering consensus, transactions, and Raft..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#4C70A6] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Access Policy
                </label>
                <select
                  value={accessPolicy}
                  onChange={(e) => setAccessPolicy(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-[#4C70A6]"
                >
                  <option value="INVITATION_ONLY">Invitation Only</option>
                  <option value="APPROVAL_REQUIRED">Teacher Approval Required</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Timing Mode
                </label>
                <select
                  value={timingMode}
                  onChange={(e) => setTimingMode(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-md outline-none focus:ring-1 focus:ring-[#4C70A6]"
                >
                  <option value="WHOLE_PAPER">Whole Paper Timed</option>
                  <option value="SECTION_TIMED">Per-Section Timed</option>
                  <option value="QUESTION_TIMED">Per-Question Timed</option>
                  <option value="MIXED">Mixed Timing</option>
                </select>
              </div>
            </div>

            <Input
              label="Total Paper Duration (Minutes)"
              type="number"
              min={15}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />

            <div className="flex justify-end gap-2 mt-3 border-t border-slate-100 pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isCreating}>
                Create Draft & Open Builder
              </Button>
            </div>
          </form>
        </Modal>

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
            {["ALL", "DRAFT", "PUBLISHED", "CLOSED"].map((st) => (
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
                <TableHead>Access Policy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    No examinations found in database. Click 'Create New Exam' to start.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs">{exam.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {exam.id} • {exam.totalQuestions} Questions
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
