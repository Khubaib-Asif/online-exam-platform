import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  FileCheck,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Save,
  Brain,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import {
  useGetSessionGradingDetailQuery,
  useConfirmGradeMutation,
  type QuestionGradeDetail,
} from "@redux/services/gradingApi";

export const GradeReviewScreen: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const {
    data: sessionData,
    isLoading,
    isError,
    refetch,
  } = useGetSessionGradingDetailQuery(submissionId || "", {
    skip: !submissionId,
  });

  const [confirmGradeMutation, { isLoading: isSaving }] = useConfirmGradeMutation();

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [marksOverrides, setMarksOverrides] = useState<Record<string, number>>({});
  const [feedbackOverrides, setFeedbackOverrides] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filter subjective questions or fallback to all questions
  const subjectiveQuestions = sessionData?.grades || [];
  const currentQ: QuestionGradeDetail | undefined = subjectiveQuestions[selectedQuestionIndex];

  const defaultMarks = currentQ
    ? currentQ.awardedMarks !== null
      ? currentQ.awardedMarks
      : currentQ.aiSuggestion?.suggestedMarks !== null && currentQ.aiSuggestion?.suggestedMarks !== undefined
      ? currentQ.aiSuggestion.suggestedMarks
      : currentQ.maxMarks
    : 0;

  const currentAwardedMarks = currentQ ? (marksOverrides[currentQ.id] ?? defaultMarks) : 0;
  const currentFeedback = currentQ ? (feedbackOverrides[currentQ.id] ?? "") : "";

  const handleSaveMarks = async () => {
    if (!currentQ || !submissionId) return;

    try {
      await confirmGradeMutation({
        sessionId: submissionId,
        gradeId: currentQ.id,
        awardedMarks: currentAwardedMarks,
        feedback: currentFeedback,
      }).unwrap();

      setSaveSuccessMsg("Marks saved successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);

      // Auto-advance to next pending question if available
      if (selectedQuestionIndex < subjectiveQuestions.length - 1) {
        setSelectedQuestionIndex(selectedQuestionIndex + 1);
      }
    } catch (err: any) {
      console.error("Failed to confirm grade:", err);
    }
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Grade Review">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-3 shadow-2xs">
          <RefreshCw className="w-8 h-8 text-[#4C70A6] animate-spin" />
          <p className="text-xs font-medium text-slate-600">Loading attempt grading details & AI suggestions...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !sessionData) {
    return (
      <AppLayout pageTitle="Grade Review">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <button
            onClick={() => navigate("/grading")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Grading Queue</span>
          </button>
          <div className="bg-rose-50 border border-rose-200 rounded-md p-6 text-center text-xs text-rose-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Failed to load grading details for submission {submissionId}.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={`Grade Review — ${sessionData.studentName}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/grading")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Grading Queue</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#4C70A6]" />
                <span>Subjective Answer Grade Review</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Student: <span className="font-semibold text-slate-900">{sessionData.studentName}</span> • Exam: <span className="font-semibold">{sessionData.examTitle}</span>
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/grading/${submissionId}/confirm`)}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Finish & Review Summary
            </Button>
          </div>

          {/* Question Selector Tabs */}
          {subjectiveQuestions.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Questions:</span>
              {subjectiveQuestions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuestionIndex(idx)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 ${
                    selectedQuestionIndex === idx
                      ? "bg-slate-900 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>Q{idx + 1} ({q.questionType})</span>
                  {q.state === "TEACHER_CONFIRMED" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ) : q.state === "PENDING_AI_REVIEW" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {currentQ ? (
            <>
              {/* Question & Student Answer Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-5 flex flex-col gap-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono">
                      Question {selectedQuestionIndex + 1} ({currentQ.questionType})
                    </span>
                    <Badge variant={currentQ.state === "TEACHER_CONFIRMED" ? "success" : "warning"}>
                      {currentQ.state === "TEACHER_CONFIRMED" ? "Confirmed" : "Pending Review"}
                    </Badge>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    Max Marks: {currentQ.maxMarks}
                  </span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">{currentQ.questionPrompt}</p>

                {currentQ.rubric && (
                  <div className="bg-white p-3 rounded border border-slate-200 text-slate-700">
                    <span className="font-bold text-slate-900 block mb-0.5">Teacher Rubric:</span>
                    <p>{currentQ.rubric}</p>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3">
                  <div className="font-bold text-slate-900 font-mono mb-1">Student Answer:</div>
                  <p className="bg-white p-3 rounded border border-slate-200 text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {currentQ.studentAnswer || "(No answer submitted)"}
                  </p>
                </div>
              </div>

              {/* AI Suggestion Panel */}
              {currentQ.aiSuggestion && currentQ.aiSuggestion.suggestedMarks !== null && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-md p-5 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Brain className="w-4 h-4 text-amber-600" />
                      <span>AI Grading Assistant Suggestion</span>
                    </div>
                    <Badge variant="warning" className="font-mono">
                      Suggested: {currentQ.aiSuggestion.suggestedMarks} / {currentQ.maxMarks} pts
                    </Badge>
                  </div>

                  <p className="text-amber-900 leading-relaxed">
                    <strong>Rationale:</strong> {currentQ.aiSuggestion.rationale}
                  </p>

                  {currentQ.aiSuggestion.matchedKeywords.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-amber-900">Matched Concepts:</span>
                      {currentQ.aiSuggestion.matchedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="bg-white text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Teacher Final Decision Override Form */}
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Teacher Final Mark & Feedback
                  </h3>
                  {saveSuccessMsg && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      {saveSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={`Awarded Marks (Out of ${currentQ.maxMarks})`}
                    type="number"
                    min={0}
                    max={currentQ.maxMarks}
                    value={currentAwardedMarks}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMarksOverrides((prev) => ({ ...prev, [currentQ.id]: val }));
                    }}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Teacher Feedback Comments
                    </label>
                    <textarea
                      rows={2}
                      value={currentFeedback}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFeedbackOverrides((prev) => ({ ...prev, [currentQ.id]: val }));
                      }}
                      placeholder="Optional feedback note for audit trail..."
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSaveMarks}
                    isLoading={isSaving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Save & Confirm Marks
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-8 text-slate-400 text-xs">
              No questions found for review.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

