import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { CheckCircle2, ArrowLeft, Send, RefreshCw, AlertCircle, Eye } from "lucide-react";
import { useGetSessionGradingDetailQuery } from "@redux/services/gradingApi";

export const GradeConfirmationScreen: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const {
    data: sessionData,
    isLoading,
    isError,
  } = useGetSessionGradingDetailQuery(submissionId || "", {
    skip: !submissionId,
  });

  if (isLoading) {
    return (
      <AppLayout pageTitle="Grade Confirmation">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-3 shadow-2xs">
          <RefreshCw className="w-8 h-8 text-[#4C70A6] animate-spin" />
          <p className="text-xs font-medium text-slate-600">Loading grade totals...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !sessionData) {
    return (
      <AppLayout pageTitle="Grade Confirmation">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <button
            onClick={() => navigate("/grading")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Queue</span>
          </button>
          <div className="bg-rose-50 border border-rose-200 rounded-md p-6 text-center text-xs text-rose-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Failed to load attempt details.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { totals } = sessionData;

  return (
    <AppLayout pageTitle="Grade Confirmation">
      <div className="max-w-md mx-auto flex flex-col gap-6 text-center">
        <div>
          <button
            onClick={() => navigate(`/grading/${submissionId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Question Review</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col items-center gap-5">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />

          <div>
            <h1 className="text-xl font-bold text-slate-900">Grade Summary & Status</h1>
            <p className="text-xs text-slate-500 mt-1">
              Final evaluated scores for <span className="font-semibold text-slate-900">{sessionData.studentName}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{sessionData.examTitle}</p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-left text-xs font-mono flex flex-col gap-2">
            <div className="flex justify-between">
              <span>Objective Marks:</span>
              <span className="font-bold text-slate-900">{totals.objectiveScore} pts</span>
            </div>
            <div className="flex justify-between">
              <span>Subjective Marks:</span>
              <span className="font-bold text-slate-900">{totals.subjectiveScore} pts</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
              <span>Total Final Grade:</span>
              <span className="text-emerald-700">{totals.totalAwarded} / {totals.totalMax} pts</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Percentage:</span>
              <span className="font-bold text-slate-700">
                {totals.totalMax > 0 ? ((totals.totalAwarded / totals.totalMax) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {sessionData.isPublished ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 p-3 rounded-md text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Result Snapshot is Published to Student!</span>
            </div>
          ) : totals.isReadyForPublication ? (
            <div className="w-full flex flex-col gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md text-xs text-emerald-800 font-semibold">
                All questions confirmed! Ready for publication.
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/grading/publish/${sessionData.examId}`)}
                icon={<Send className="w-4 h-4" />}
              >
                Proceed to Result Publication
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-xs text-amber-800 font-medium">
                Some subjective questions still have pending AI review. Please confirm them before publication.
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/grading/${submissionId}`)}
                icon={<Eye className="w-4 h-4" />}
              >
                Review Remaining Questions
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

