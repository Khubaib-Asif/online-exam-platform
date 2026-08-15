import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { CheckCircle2, ArrowLeft, Send, ShieldCheck } from "lucide-react";

export const GradeConfirmationScreen: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const [isConfirmed, setIsConfirmed] = useState(false);

  const summary = {
    submissionId: submissionId || "sub-501",
    studentName: "Alex Rivera",
    examTitle: "CS 401 — Distributed Systems",
    objectiveScore: 40,
    subjectiveScore: 47,
    totalScore: 87,
    maxScore: 100,
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
  };

  return (
    <AppLayout pageTitle="Grade Confirmation">
      <div className="max-w-md mx-auto flex flex-col gap-6 text-center">
        <div>
          <button
            onClick={() => navigate("/grading")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Queue</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col items-center gap-5">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />

          <div>
            <h1 className="text-xl font-bold text-slate-900">Confirm Final Marks</h1>
            <p className="text-xs text-slate-500 mt-1">
              Record immutable teacher mark decision for {summary.studentName}.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-left text-xs font-mono flex flex-col gap-2">
            <div className="flex justify-between">
              <span>Objective Marks:</span>
              <span className="font-bold text-slate-900">{summary.objectiveScore} / 40</span>
            </div>
            <div className="flex justify-between">
              <span>Subjective Marks:</span>
              <span className="font-bold text-slate-900">{summary.subjectiveScore} / 60</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
              <span>Total Final Grade:</span>
              <span className="text-emerald-700">{summary.totalScore} / {summary.maxScore}</span>
            </div>
          </div>

          {isConfirmed ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 p-3 rounded-md text-xs text-emerald-800 font-semibold">
              Final marks confirmed! Ready for publication.
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Lock Grade Snapshot
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
