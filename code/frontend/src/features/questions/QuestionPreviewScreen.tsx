import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Eye, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { useGetQuestionDetailsQuery } from "@/redux/services/questionBankApi";

export const QuestionPreviewScreen: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const targetId = questionId || "q-101";

  const { data: apiDetails, isLoading } = useGetQuestionDetailsQuery(targetId, { skip: !questionId });
  const activeVersion = apiDetails?.versions[0];

  const question = activeVersion
    ? {
        id: apiDetails.id,
        version: activeVersion.versionNumber,
        type: activeVersion.type,
        prompt: activeVersion.content,
        marks: activeVersion.marks,
        options: activeVersion.options.map((optText, idx) => ({ id: `opt-${idx}`, text: optText })),
      }
    : {
        id: targetId,
        version: 2,
        type: "MCQ" as const,
        prompt: "In Paxos consensus, what is the minimum quorum size required for a cluster of N nodes?",
        marks: 4,
        options: [
          { id: "opt-1", text: "N / 2" },
          { id: "opt-2", text: "floor(N / 2) + 1" },
          { id: "opt-3", text: "N - 1" },
          { id: "opt-4", text: "2 * N + 1" },
        ],
      };

  return (
    <AppLayout pageTitle={`Question Preview — ${question.id}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/question-bank")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Question Bank</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info">Student View Projection</Badge>
                <Badge variant="outline" className="font-mono">v{question.version}</Badge>
              </div>
              <h1 className="text-lg font-bold text-slate-900">Student Question Delivery Preview</h1>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/question-bank/${question.id}/edit`)}
            >
              Edit Question
            </Button>
          </div>

          {/* Student Delivery Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Question 1</span>
              <span className="font-mono font-bold text-slate-900">{question.marks} Points</span>
            </div>

            <h3 className="text-sm font-semibold text-slate-900 leading-relaxed">
              {question.prompt}
            </h3>

            <div className="flex flex-col gap-2 mt-2">
              {question.options.map((opt, idx) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-md cursor-pointer hover:border-slate-300 transition-colors text-xs text-slate-800"
                >
                  <input
                    type="radio"
                    name="preview-mcq"
                    className="w-4 h-4 text-[#4C70A6] focus:ring-[#4C70A6]"
                  />
                  <span className="font-mono font-bold text-slate-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-md border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security Assertion:</span>
              <p className="mt-0.5 text-amber-800">
                Objective answer keys and subjective teacher rubrics are stripped from student-visible delivery projections.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
