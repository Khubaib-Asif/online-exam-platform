import React, { useState } from "react";
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
  ShieldCheck,
  Save,
  Brain,
} from "lucide-react";

export const GradeReviewScreen: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const [awardedMarks, setAwardedMarks] = useState<number>(7);
  const [feedback, setFeedback] = useState(
    "Good explanation of coordinator crash failure mode and blocking behaviour. Included quorum recovery notes."
  );

  const submission = {
    id: submissionId || "sub-501",
    studentName: "Alex Rivera",
    examTitle: "CS 401 — Distributed Systems",
    question: {
      id: "q-104",
      prompt: "Explain the two-phase commit (2PC) protocol failure mode when the coordinator crashes.",
      maxMarks: 8,
      studentAnswer:
        "When the coordinator crashes during Phase 2 after sending Prepare requests, participants remain blocked in prepared state because they cannot unilaterally commit or abort without violating consistency.",
      aiSuggestion: {
        suggestedMarks: 7,
        confidence: "HIGH",
        rationale: "Correctly identifies blocking nature during coordinator failure and phase 2 state transition.",
        matchedKeywords: ["coordinator crash", "blocked", "prepare", "consistency"],
      },
    },
  };

  return (
    <AppLayout pageTitle={`Grade Review — ${submission.id}`}>
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
                Student: <span className="font-semibold text-slate-900">{submission.studentName}</span> • Submission: <span className="font-mono">{submission.id}</span>
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/grading/${submission.id}/confirm`)}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Final Mark
            </Button>
          </div>

          {/* Question & Student Answer Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-5 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 font-mono">Question Prompt</span>
              <span className="font-mono font-bold text-slate-900">Max Marks: {submission.question.maxMarks}</span>
            </div>
            <p className="text-slate-800 font-medium leading-relaxed">{submission.question.prompt}</p>

            <div className="border-t border-slate-200 pt-3">
              <div className="font-bold text-slate-900 font-mono mb-1">Student Answer:</div>
              <p className="bg-white p-3 rounded border border-slate-200 text-slate-800 leading-relaxed font-sans">
                {submission.question.studentAnswer}
              </p>
            </div>
          </div>

          {/* AI Suggestion Panel */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-5 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Brain className="w-4 h-4 text-amber-600" />
                <span>AI Grading Assistant Suggestion</span>
              </div>
              <Badge variant="warning" className="font-mono">
                Suggested: {submission.question.aiSuggestion.suggestedMarks} / {submission.question.maxMarks} pts
              </Badge>
            </div>

            <p className="text-amber-900 leading-relaxed">
              <strong>Rationale:</strong> {submission.question.aiSuggestion.rationale}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-amber-900">Matched Keywords:</span>
              {submission.question.aiSuggestion.matchedKeywords.map((kw) => (
                <span key={kw} className="bg-white text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Teacher Final Decision Override Form */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Teacher Final Mark & Feedback
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={`Awarded Marks (Out of ${submission.question.maxMarks})`}
                type="number"
                min={0}
                max={submission.question.maxMarks}
                value={awardedMarks}
                onChange={(e) => setAwardedMarks(Number(e.target.value))}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Feedback Comments
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/grading/${submission.id}/confirm`)}
                icon={<Save className="w-4 h-4" />}
              >
                Save & Confirm Marks
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
