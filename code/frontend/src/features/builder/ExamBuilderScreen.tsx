import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Modal } from "@components/ui/Modal";
import {
  BookOpen,
  Plus,
  Trash2,
  ArrowLeft,
  Settings,
  Eye,
  Send,
  HelpCircle,
  ShieldCheck,
  Lock,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";

export interface ExamSection {
  id: string;
  title: string;
  durationMinutes: number;
  questionIds: string[];
}

export const ExamBuilderScreen: React.FC = () => {
  const { examId } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(examId && examId !== "new");

  // Mock status: ex-401 is PUBLISHED (locked), new is DRAFT
  const isPublished = examId === "ex-401";

  const [examTitle, setExamTitle] = useState(
    isEditing ? "CS 401 — Distributed Systems & Architecture" : "Untitled Examination"
  );
  const [sections, setSections] = useState<ExamSection[]>([
    {
      id: "sec-1",
      title: "Section A: Distributed Consensus & Core Concepts",
      durationMinutes: 45,
      questionIds: ["q-101", "q-102", "q-103"],
    },
    {
      id: "sec-2",
      title: "Section B: System Design & Fault Tolerance",
      durationMinutes: 75,
      questionIds: ["q-104", "q-105"],
    },
  ]);

  // Create Question Modal state inside builder
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [newQPrompt, setNewQPrompt] = useState("");
  const [newQType, setNewQType] = useState<"MCQ" | "SHORT_ANSWER">("MCQ");

  const handleAddSection = () => {
    if (isPublished) return;
    const newSec: ExamSection = {
      id: `sec-${sections.length + 1}`,
      title: `Section ${String.fromCharCode(65 + sections.length)}: New Section`,
      durationMinutes: 30,
      questionIds: [],
    };
    setSections([...sections, newSec]);
  };

  const handleRemoveSection = (id: string) => {
    if (isPublished) return;
    setSections(sections.filter((s) => s.id !== id));
  };

  const handleSectionTitleChange = (id: string, title: string) => {
    if (isPublished) return;
    setSections(sections.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const handleOpenAddQuestionModal = (sectionId: string) => {
    if (isPublished) return;
    setTargetSectionId(sectionId);
    setNewQPrompt("");
    setIsAddQuestionModalOpen(true);
  };

  const handleConfirmAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId || !newQPrompt.trim()) return;
    const newQId = `q-${Date.now().toString().slice(-3)}`;
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === targetSectionId
          ? { ...sec, questionIds: [...sec.questionIds, newQId] }
          : sec
      )
    );
    setIsAddQuestionModalOpen(false);
  };

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionIds.length, 0);
  const totalDuration = sections.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <AppLayout pageTitle={isEditing ? `Exam Builder — ${examId}` : "Create Exam"}>
      <div className="flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/exams")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exams</span>
          </button>
        </div>

        {/* Lockout Warning Banner if Exam is Published */}
        {isPublished && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block mb-0.5">
                Published Revision Locked
              </span>
              <p className="text-amber-800 leading-relaxed">
                This published examination revision (rev 3) is locked to prevent concurrent split-attempt revisions for active candidates. To make changes, unpublish the exam or create a new draft revision.
              </p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isPublished ? "success" : "warning"}>
                  {isPublished ? "Published Revision v3" : "Draft Revision"}
                </Badge>
                <span className="text-xs font-mono text-slate-400">ID: {examId || "new-exam"}</span>
              </div>
              <input
                type="text"
                disabled={isPublished}
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="text-xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-[#4C70A6] focus:outline-none w-full bg-transparent disabled:opacity-80"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/builder/${examId || "ex-401"}/settings`)}
                icon={<Settings className="w-3.5 h-3.5 text-slate-600" />}
              >
                Settings & Audience
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/builder/${examId || "ex-401"}/preview`)}
                icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
              >
                Preview Paper
              </Button>
              {!isPublished && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/builder/${examId || "ex-401"}/publish`)}
                  icon={<Send className="w-4 h-4" />}
                >
                  Validate & Publish
                </Button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200/80 font-mono text-xs text-slate-700">
            <div>
              <span className="text-slate-400">Sections:</span>{" "}
              <span className="font-bold text-slate-900">{sections.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Questions:</span>{" "}
              <span className="font-bold text-slate-900">{totalQuestions}</span>
            </div>
            <div>
              <span className="text-slate-400">Duration Sum:</span>{" "}
              <span className="font-bold text-slate-900">{totalDuration} mins</span>
            </div>
            <div>
              <span className="text-slate-400">Navigation:</span>{" "}
              <span className="font-bold text-slate-900">FORWARD_ONLY</span>
            </div>
          </div>

          {/* Sections List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Exam Sections Composition
              </h3>
              {!isPublished && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddSection}
                  icon={<Plus className="w-3.5 h-3.5 text-[#4C70A6]" />}
                  className="text-xs text-[#4C70A6]"
                >
                  Add Section
                </Button>
              )}
            </div>

            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      0{idx + 1}.
                    </span>
                    <input
                      type="text"
                      disabled={isPublished}
                      value={sec.title}
                      onChange={(e) => handleSectionTitleChange(sec.id, e.target.value)}
                      className="font-bold text-sm text-slate-900 bg-transparent border-b border-slate-200 focus:border-[#4C70A6] focus:outline-none flex-1 py-1 disabled:opacity-80"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
                    <span>{sec.durationMinutes} mins</span>
                    {sections.length > 1 && !isPublished && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSection(sec.id)}
                        icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                      />
                    )}
                  </div>
                </div>

                {/* Section Questions */}
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Question Versions in Section ({sec.questionIds.length})</span>
                    {!isPublished && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAddQuestionModal(sec.id)}
                          icon={<PlusCircle className="w-3 h-3 text-[#4C70A6]" />}
                          className="text-[11px] text-[#4C70A6]"
                        >
                          Create New Question
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/question-bank")}
                          icon={<HelpCircle className="w-3 h-3 text-slate-600" />}
                          className="text-[11px] text-slate-600"
                        >
                          Question Bank
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sec.questionIds.map((qid, qidx) => (
                      <div
                        key={qid}
                        className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs font-mono flex items-center gap-2 shadow-2xs"
                      >
                        <span className="text-slate-400 font-bold">{qidx + 1}.</span>
                        <span className="font-semibold text-slate-800">{qid} (v1)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Architecture Invariant: Once an exam revision is published, it cannot be modified in-place.</span>
          </div>
        </div>
      </div>

      {/* Add New Question Modal */}
      <Modal
        isOpen={isAddQuestionModalOpen}
        onClose={() => setIsAddQuestionModalOpen(false)}
        title="Create & Add Question to Section"
        subtitle="Add a new teacher-authored question directly into this examination."
      >
        <form onSubmit={handleConfirmAddQuestion} className="flex flex-col gap-4 text-left">
          <Input
            label="Question Prompt / Wording"
            value={newQPrompt}
            onChange={(e) => setNewQPrompt(e.target.value)}
            placeholder="e.g. Explain Raft leader lease mechanism..."
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type
            </label>
            <select
              value={newQType}
              onChange={(e) => setNewQType(e.target.value as "MCQ" | "SHORT_ANSWER")}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#4C70A6]/30 outline-none"
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="SHORT_ANSWER">Short Answer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" icon={<Plus className="w-4 h-4" />}>
              Add to Section
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};
