import React, { useState, useEffect } from "react";
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
  PlusCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  useGetExamDetailsQuery,
  useAddSectionMutation,
  useDeleteSectionMutation,
  useAddQuestionToSectionMutation,
  useUpdateSectionQuestionMutation,
  useRemoveQuestionFromSectionMutation,
} from "@/redux/services/examBuilderApi";
import {
  useGetQuestionBanksQuery,
  useGetBankQuestionsQuery,
  useCreateQuestionMutation,
} from "@/redux/services/questionBankApi";

// Helper function to format duration in human-readable mins and secs
const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0 && secs > 0) {
    return `${mins} min ${secs} sec`;
  } else if (mins > 0) {
    return `${mins} min${mins > 1 ? "s" : ""}`;
  } else {
    return `${secs} sec${secs > 1 ? "s" : ""}`;
  }
};

export const ExamBuilderScreen: React.FC = () => {
  const { examId } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  useEffect(() => {
    if (examId === "new") {
      navigate("/exams?create=true", { replace: true });
    }
  }, [examId, navigate]);

  const { data: apiDetails, refetch: refetchExam } = useGetExamDetailsQuery(targetId, { skip: !targetId || targetId === "new" });
  const { data: banksData } = useGetQuestionBanksQuery();
  const defaultBankId = banksData?.[0]?.id || "qb-default";

  const { data: bankQuestions } = useGetBankQuestionsQuery(
    { bankId: defaultBankId },
    { skip: !defaultBankId }
  );

  const [addSectionApi, { isLoading: isAddingSection }] = useAddSectionMutation();
  const [deleteSectionApi] = useDeleteSectionMutation();
  const [addQuestionToSectionApi, { isLoading: isAttachingQuestion }] = useAddQuestionToSectionMutation();
  const [updateSectionQuestionApi] = useUpdateSectionQuestionMutation();
  const [removeQuestionFromSectionApi] = useRemoveQuestionFromSectionMutation();
  const [createQuestionApi, { isLoading: isCreatingQuestion }] = useCreateQuestionMutation();

  const isPublished = apiDetails?.status === "PUBLISHED";
  const [examTitle, setExamTitle] = useState("");

  // Section Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDesc, setNewSectionDesc] = useState("");
  const [newSectionDurationSec, setNewSectionDurationSec] = useState<number | "">(1800);

  // Bank Question Picker Modal State
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [selectedQuestionVersionId, setSelectedQuestionVersionId] = useState<string | null>(null);

  // Inline Create Question Modal State
  const [isCreateQModalOpen, setIsCreateQModalOpen] = useState(false);
  const [qType, setQType] = useState<"MCQ" | "MSQ" | "TRUE_FALSE" | "SHORT" | "LONG">("MCQ");
  const [qPrompt, setQPrompt] = useState("");
  const [qMarks, setQMarks] = useState<number>(4);

  // Options state for MCQ / MSQ
  const [mcqOptions, setMcqOptions] = useState<string[]>(["Option 1", "Option 2", "Option 3", "Option 4"]);
  const [mcqCorrectIdx, setMcqCorrectIdx] = useState<number>(0);
  const [msqCorrectIdxs, setMsqCorrectIdxs] = useState<number[]>([0]);
  const [tfAnswerKey, setTfAnswerKey] = useState<"True" | "False">("True");

  // Evaluation Rubric & Keywords for Short & Long
  const [qRubric, setQRubric] = useState("");
  const [qKeywords, setQKeywords] = useState("");

  // Timing Override Modal State
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [editEqTimeLimit, setEditEqTimeLimit] = useState<number | "">("");
  const [editEqMarksOverride, setEditEqMarksOverride] = useState<number | "">("");

  // 1. Add New Section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !newSectionTitle.trim()) return;

    try {
      await addSectionApi({
        examId: targetId,
        title: newSectionTitle.trim(),
        description: newSectionDesc.trim() || undefined,
        durationSeconds: newSectionDurationSec !== "" ? Number(newSectionDurationSec) : undefined,
      }).unwrap();

      setIsSectionModalOpen(false);
      setNewSectionTitle("");
      setNewSectionDesc("");
      refetchExam();
    } catch (err) {
      console.error("Add section error:", err);
      alert("Failed to add section.");
    }
  };

  // 2. Delete Section
  const handleDeleteSection = async (secId: string) => {
    if (!window.confirm("Are you sure you want to delete this section and its linked questions?")) return;
    try {
      await deleteSectionApi(secId).unwrap();
      refetchExam();
    } catch (err) {
      console.error("Delete section error:", err);
    }
  };

  // 3. Attach Existing Question from Question Bank
  const handleAttachBankQuestion = async () => {
    if (!targetSectionId || !selectedQuestionVersionId) return;
    try {
      await addQuestionToSectionApi({
        sectionId: targetSectionId,
        questionVersionId: selectedQuestionVersionId,
      }).unwrap();

      setIsBankPickerOpen(false);
      setSelectedQuestionVersionId(null);
      refetchExam();
    } catch (err) {
      console.error("Attach question error:", err);
      alert("Failed to attach question to section.");
    }
  };

  // 4. Create & Attach New Question Inline
  const handleCreateAndAttachQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId || !qPrompt.trim()) return;

    try {
      const payload: any = {
        type: qType,
        content: qPrompt.trim(),
        marks: qMarks,
        tags: ["Exam Authoring"],
      };

      if (qType === "MCQ") {
        const cleanOpts = mcqOptions.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          alert("MCQ requires at least 2 non-empty options.");
          return;
        }
        payload.options = cleanOpts;
        payload.answerKey = cleanOpts[mcqCorrectIdx] || cleanOpts[0];
      } else if (qType === "MSQ") {
        const cleanOpts = mcqOptions.map((o) => o.trim()).filter(Boolean);
        if (cleanOpts.length < 2) {
          alert("MSQ requires at least 2 non-empty options.");
          return;
        }
        payload.options = cleanOpts;
        payload.answerKey = msqCorrectIdxs.map((idx) => cleanOpts[idx]).filter(Boolean);
      } else if (qType === "TRUE_FALSE") {
        payload.options = ["True", "False"];
        payload.answerKey = tfAnswerKey;
      } else if (qType === "SHORT" || qType === "LONG") {
        payload.rubric = qRubric.trim() || "Evaluation based on conceptual accuracy and key terms.";
        payload.keywords = qKeywords.trim()
          ? qKeywords.split(",").map((k) => k.trim()).filter(Boolean)
          : ["key concept"];
      }

      // Step A: Create in M3 Question Bank
      const qRes: any = await createQuestionApi({ bankId: defaultBankId, question: payload }).unwrap();
      const versionId =
        qRes?.data?.versions?.[0]?.id ||
        qRes?.versions?.[0]?.id ||
        qRes?.data?.id ||
        qRes?.id;

      if (!versionId) {
        alert("Failed to create question version record.");
        return;
      }

      // Step B: Attach to M4 Exam Section
      await addQuestionToSectionApi({
        sectionId: targetSectionId,
        questionVersionId: versionId,
      }).unwrap();

      setIsCreateQModalOpen(false);
      setQPrompt("");
      setQRubric("");
      setQKeywords("");
      refetchExam();
    } catch (err) {
      console.error("Inline question creation error:", err);
      alert("Failed to create and attach question.");
    }
  };

  // 5. Update Question Time Limit or Marks Override
  const handleSaveQuestionOverrides = async (eqId: string) => {
    try {
      await updateSectionQuestionApi({
        examQuestionId: eqId,
        marksOverride: editEqMarksOverride !== "" ? Number(editEqMarksOverride) : null,
        timeLimitSeconds: editEqTimeLimit !== "" ? Number(editEqTimeLimit) : null,
      }).unwrap();

      setEditingEqId(null);
      refetchExam();
    } catch (err) {
      console.error("Update question timing error:", err);
    }
  };

  // 6. Remove Question from Section
  const handleRemoveQuestion = async (eqId: string) => {
    try {
      await removeQuestionFromSectionApi(eqId).unwrap();
      refetchExam();
    } catch (err) {
      console.error("Remove question error:", err);
    }
  };

  const sections = apiDetails?.sections || [];
  const totalQuestions = sections.reduce((sum, sec) => sum + sec.questions.length, 0);
  const totalMarks = sections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qSum, q) => qSum + q.marks, 0),
    0
  );

  return (
    <AppLayout pageTitle={`Exam Builder — ${apiDetails?.title || targetId}`}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/builder")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam List</span>
          </button>
        </div>

        {isPublished && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center justify-between">
            <span>
              <strong>Published Revision Locked:</strong> This exam revision is published. Content changes require creating a new revision.
            </span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isPublished ? "success" : "warning"}>
                  {isPublished ? "Published Revision" : "Draft Revision"}
                </Badge>
                <span className="text-xs font-mono text-slate-400">ID: {targetId}</span>
              </div>
              <input
                type="text"
                value={apiDetails?.title || examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                disabled={isPublished}
                className="text-xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#4C70A6] outline-none transition-colors w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/builder/${targetId}/settings`)}
                icon={<Settings className="w-3.5 h-3.5 text-slate-600" />}
              >
                Settings & Timing
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/builder/${targetId}/preview`)}
                icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
              >
                Preview Paper
              </Button>
              {!isPublished && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/builder/${targetId}/publish`)}
                  icon={<Send className="w-4 h-4" />}
                >
                  Publish Exam
                </Button>
              )}
            </div>
          </div>

          {/* Timing Mode & Summary Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4C70A6]" />
                <span>
                  Timing Mode: <strong className="font-bold text-slate-900">{apiDetails?.timingMode || "WHOLE_PAPER"}</strong>
                </span>
              </span>
              <span>•</span>
              <span>
                Paper Duration: <strong className="font-bold text-slate-900">{apiDetails?.durationMinutes || 120} mins</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs font-bold text-slate-800">
              <Badge variant="outline">{sections.length} Sections</Badge>
              <Badge variant="outline">{totalQuestions} Questions</Badge>
              <Badge variant="info">{totalMarks} Total Points</Badge>
            </div>
          </div>

          {/* Sections List */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Exam Sections ({sections.length})
              </h2>

              {!isPublished && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSectionModalOpen(true)}
                  icon={<Plus className="w-3.5 h-3.5 text-[#4C70A6]" />}
                >
                  Add New Section
                </Button>
              )}
            </div>

            {sections.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-md p-8 text-center bg-slate-50/50 flex flex-col items-center gap-3">
                <BookOpen className="w-8 h-8 text-slate-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No sections added yet</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Click 'Add New Section' above to start structuring your examination paper.
                  </p>
                </div>
              </div>
            ) : (
              sections.map((section, secIdx) => (
                <div
                  key={section.id}
                  className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold bg-[#4C70A6] text-white w-6 h-6 rounded-md flex items-center justify-center shadow-2xs">
                        {String.fromCharCode(65 + secIdx)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                          {section.durationSeconds && (
                            <span className="font-mono text-xs font-semibold text-[#4C70A6] bg-[#4C70A6]/10 px-2 py-0.5 rounded border border-[#4C70A6]/20">
                              ({formatDuration(section.durationSeconds)})
                            </span>
                          )}
                        </div>
                        {section.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                        )}
                      </div>
                    </div>

                    {!isPublished && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setTargetSectionId(section.id);
                            setIsBankPickerOpen(true);
                          }}
                          icon={<PlusCircle className="w-3.5 h-3.5 text-[#4C70A6]" />}
                        >
                          Add From Bank
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setTargetSectionId(section.id);
                            setIsCreateQModalOpen(true);
                          }}
                          icon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Create New Question
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                        />
                      </div>
                    )}
                  </div>

                  {/* Questions inside Section */}
                  <div className="flex flex-col gap-2">
                    {section.questions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No questions in this section. Add questions from your bank or author new questions above.
                      </p>
                    ) : (
                      section.questions.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-md border border-slate-200/80 text-xs"
                        >
                          <div className="flex items-start gap-2 max-w-xl">
                            <span className="font-mono text-slate-400 shrink-0 mt-0.5">
                              Q{qIdx + 1}.
                            </span>
                            <div>
                              <div className="font-medium text-slate-900 line-clamp-2">
                                {q.prompt}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{q.type}</Badge>
                                {q.timeLimitSeconds && (
                                  <span className="text-[10px] font-mono font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {formatDuration(q.timeLimitSeconds)} limit
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              onClick={() => {
                                setEditingEqId(q.id);
                                setEditEqTimeLimit(q.timeLimitSeconds || "");
                                setEditEqMarksOverride(q.marks || "");
                              }}
                              className="font-mono font-bold text-slate-800 hover:text-[#4C70A6] cursor-pointer transition-colors"
                              title="Click to edit time limit or points"
                            >
                              {q.marks} pts
                            </button>

                            {!isPublished && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveQuestion(q.id)}
                                icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />}
                              />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal 1: Add Section */}
        <Modal
          isOpen={isSectionModalOpen}
          onClose={() => setIsSectionModalOpen(false)}
          title="Add New Exam Section"
        >
          <form onSubmit={handleAddSection} className="flex flex-col gap-4">
            <Input
              label="Section Title *"
              required
              placeholder="e.g. Section A: Multiple Choice Questions"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
            />
            <Input
              label="Section Description (Optional)"
              placeholder="e.g. Answer all questions. All questions carry equal marks."
              value={newSectionDesc}
              onChange={(e) => setNewSectionDesc(e.target.value)}
            />
            <Input
              label="Section Duration in Seconds (Optional)"
              type="number"
              min={0}
              placeholder="e.g. 1800 for 30 mins, 70 for 1 min 10 sec"
              value={newSectionDurationSec}
              onChange={(e) => setNewSectionDurationSec(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setIsSectionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isAddingSection}>
                Add Section
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: Pick Question from Bank */}
        <Modal
          isOpen={isBankPickerOpen}
          onClose={() => setIsBankPickerOpen(false)}
          title="Select Question from Question Bank"
        >
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            {!bankQuestions || bankQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No questions found in your Question Bank. Create a question first or use 'Create New Question'.
              </p>
            ) : (
              bankQuestions.map((bq) => (
                <div
                  key={bq.id}
                  onClick={() => setSelectedQuestionVersionId(bq.versionId)}
                  className={`p-3 rounded-md border text-xs cursor-pointer flex items-start justify-between gap-3 transition-colors ${
                    selectedQuestionVersionId === bq.versionId
                      ? "bg-[#4C70A6]/10 border-[#4C70A6]"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{bq.content}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{bq.type}</Badge>
                      <span className="font-mono text-slate-500">{bq.marks} pts</span>
                      <span className="font-mono text-slate-400">v{bq.versionNumber}</span>
                    </div>
                  </div>
                  {selectedQuestionVersionId === bq.versionId && (
                    <CheckCircle2 className="w-4 h-4 text-[#4C70A6] shrink-0 mt-0.5" />
                  )}
                </div>
              ))
            )}

            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsBankPickerOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!selectedQuestionVersionId}
                isLoading={isAttachingQuestion}
                onClick={handleAttachBankQuestion}
              >
                Attach Selected Question
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal 3: Create Inline Question */}
        <Modal
          isOpen={isCreateQModalOpen}
          onClose={() => setIsCreateQModalOpen(false)}
          title="Create & Attach New Question"
        >
          <form onSubmit={handleCreateAndAttachQuestion} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Question Type</label>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-md outline-none"
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="MSQ">Multiple Select (MSQ)</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT">Short Answer</option>
                <option value="LONG">Long Answer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Question Prompt *</label>
              <textarea
                rows={3}
                required
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="Enter question statement..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-md outline-none"
              />
            </div>

            {/* MCQ Options UI */}
            {qType === "MCQ" && (
              <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-md border border-slate-200">
                <label className="text-xs font-bold text-slate-800">
                  MCQ Options & Correct Answer
                </label>
                {mcqOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mcqKey"
                      checked={mcqCorrectIdx === idx}
                      onChange={() => setMcqCorrectIdx(idx)}
                      className="w-4 h-4 text-[#4C70A6]"
                    />
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...mcqOptions];
                        updated[idx] = e.target.value;
                        setMcqOptions(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* MSQ Options UI */}
            {qType === "MSQ" && (
              <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-md border border-slate-200">
                <label className="text-xs font-bold text-slate-800">
                  MSQ Options & Correct Answers (Check all that apply)
                </label>
                {mcqOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={msqCorrectIdxs.includes(idx)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMsqCorrectIdxs([...msqCorrectIdxs, idx]);
                        } else {
                          setMsqCorrectIdxs(msqCorrectIdxs.filter((i) => i !== idx));
                        }
                      }}
                      className="w-4 h-4 text-[#4C70A6] rounded"
                    />
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...mcqOptions];
                        updated[idx] = e.target.value;
                        setMcqOptions(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* True/False UI */}
            {qType === "TRUE_FALSE" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Correct Choice</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="tfChoice"
                      value="True"
                      checked={tfAnswerKey === "True"}
                      onChange={() => setTfAnswerKey("True")}
                    />
                    True
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="tfChoice"
                      value="False"
                      checked={tfAnswerKey === "False"}
                      onChange={() => setTfAnswerKey("False")}
                    />
                    False
                  </label>
                </div>
              </div>
            )}

            {/* Short & Long Answer Evaluation Fields */}
            {(qType === "SHORT" || qType === "LONG") && (
              <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Model Answer / Evaluation Rubric (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter model answer or grading criteria for automated evaluation..."
                    value={qRubric}
                    onChange={(e) => setQRubric(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md outline-none"
                  />
                </div>

                <div>
                  <Input
                    label="Evaluation Keywords (Optional, comma-separated)"
                    placeholder="e.g. consensus, quorum, fault tolerance"
                    value={qKeywords}
                    onChange={(e) => setQKeywords(e.target.value)}
                    helperText="Required keywords for automated grading parity with Question Bank questions."
                  />
                </div>
              </div>
            )}

            <Input
              label="Awarded Marks *"
              type="number"
              min={1}
              value={qMarks}
              onChange={(e) => setQMarks(Number(e.target.value))}
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreateQModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isCreatingQuestion || isAttachingQuestion}>
                Create & Attach Question
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 4: Edit Question Timing & Marks Overrides */}
        <Modal
          isOpen={Boolean(editingEqId)}
          onClose={() => setEditingEqId(null)}
          title="Edit Per-Question Time Limit & Points"
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Question Time Limit in Seconds (Optional)"
              type="number"
              min={0}
              placeholder="e.g. 30, 45, 70 (Leave empty for untimed question)"
              value={editEqTimeLimit}
              onChange={(e) => setEditEqTimeLimit(e.target.value === "" ? "" : Number(e.target.value))}
              helperText="Enter exact duration in seconds (e.g. 30 for 30s True/False, 70 for 1 min 10 sec)."
            />

            <Input
              label="Marks Override (Optional)"
              type="number"
              min={1}
              placeholder="e.g. 10 (Leave empty to use base question marks)"
              value={editEqMarksOverride}
              onChange={(e) => setEditEqMarksOverride(e.target.value === "" ? "" : Number(e.target.value))}
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingEqId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => editingEqId && handleSaveQuestionOverrides(editingEqId)}
              >
                Save Overrides
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};
