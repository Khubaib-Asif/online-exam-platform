import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Eye, ArrowLeft, Clock, ShieldCheck, ChevronRight, Lock } from "lucide-react";
import { useGetExamDetailsQuery } from "@/redux/services/examBuilderApi";

export const ExamPreviewScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const sections = apiDetails?.sections || [];
  const currentSection = sections[activeSectionIdx] || sections[0];
  const currentQuestions = currentSection?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];

  const handleNextQuestion = () => {
    if (activeQuestionIdx < currentQuestions.length - 1) {
      setActiveQuestionIdx(activeQuestionIdx + 1);
    } else if (activeSectionIdx < sections.length - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      setActiveQuestionIdx(0);
    }
  };

  return (
    <AppLayout pageTitle={`Exam Preview — ${apiDetails?.title || targetId}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/builder/${targetId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Builder</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info">Paper Projection Preview</Badge>
                <Badge variant="outline" className="font-mono">FORWARD_ONLY</Badge>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{apiDetails?.title || "Exam Paper Preview"}</h1>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/builder/${targetId}/publish`)}
            >
              Proceed to Publication
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500">
              No sections or questions exist in this exam draft yet. Return to the Exam Builder to compose your paper.
            </div>
          ) : (
            <>
              {/* Section Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                {sections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSectionIdx(idx);
                      setActiveQuestionIdx(0);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                      activeSectionIdx === idx
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sec.title} ({sec.durationSeconds ? Math.round(sec.durationSeconds / 60) : 45}m)
                  </button>
                ))}
              </div>

              {/* Question Preview Box */}
              {!currentQuestion ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500">
                  No questions present in this section yet. Return to the Exam Builder to add questions.
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500 font-mono">
                    <span>
                      {currentSection?.title} • Question {activeQuestionIdx + 1} of {currentQuestions.length}
                    </span>
                    <div className="flex items-center gap-1 font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-[#4C70A6]" />
                      <span>{currentSection?.durationSeconds ? Math.round(currentSection.durationSeconds / 60) : 45}:00</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{currentQuestion.type}</Badge>
                      <span className="text-xs text-slate-400 font-mono">ID: {currentQuestion.id}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 leading-relaxed">
                      {currentQuestion.prompt}
                    </h3>
                  </div>

                  {currentQuestion.options && currentQuestion.options.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {currentQuestion.options.map((opt: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                        >
                          <input type="radio" disabled className="w-4 h-4 text-[#4C70A6]" />
                          <span className="font-mono font-bold text-slate-400">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!currentQuestion.options || currentQuestion.options.length === 0) && (
                    <div className="p-4 bg-white border border-slate-200 rounded-md text-xs text-slate-500 italic">
                      Subjective answer entry box (Short/Long Answer response area will be rendered for candidate).
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Forward-Only Navigation Enforcement Active
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleNextQuestion}
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      Next Question
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
