import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Send, CheckCircle2, ArrowLeft, ShieldCheck, Lock, RefreshCw, AlertCircle } from "lucide-react";
import { useGetGradingQueueQuery, usePublishResultsMutation } from "@redux/services/gradingApi";

export const ResultPublicationScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const {
    data: queueData = [],
    isLoading,
    isError,
    refetch,
  } = useGetGradingQueueQuery(examId ? { examId } : undefined);

  const [publishResultsMutation, { isLoading: isPublishing }] = usePublishResultsMutation();
  const [publishedData, setPublishedData] = useState<any | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const totalSubmissions = queueData.length;
  const gradedCount = queueData.filter((q) => q.subjectiveStatus !== "PENDING_REVIEW").length;
  const pendingSubjective = queueData.filter((q) => q.subjectiveStatus === "PENDING_REVIEW").length;
  const publishedCount = queueData.filter((q) => q.isPublished).length;

  const totalPossible = queueData.reduce((acc, q) => acc + q.objectiveTotal, 0);
  const totalAwarded = queueData.reduce((acc, q) => acc + q.objectiveScore, 0);
  const averageScore = totalPossible > 0 ? `${((totalAwarded / totalPossible) * 100).toFixed(1)}%` : "0.0%";

  const examTitle = queueData[0]?.examTitle || "Examination Results";

  const handlePublishResults = async () => {
    if (!examId) return;
    setPublishError(null);

    try {
      const res = await publishResultsMutation({ examId }).unwrap();
      setPublishedData(res);
    } catch (err: any) {
      setPublishError(err?.data?.error?.message || "Failed to publish result snapshots. Ensure all subjective questions are confirmed.");
    }
  };

  return (
    <AppLayout pageTitle={`Publish Results — ${examId || "Cohort"}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
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
                <Send className="w-5 h-5 text-[#4C70A6]" />
                <span>Result Snapshot Publication</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {examTitle} ({examId})
              </p>
            </div>
            <Badge variant={pendingSubjective === 0 ? "success" : "warning"}>
              {pendingSubjective === 0 ? `All ${totalSubmissions} Graded` : `${pendingSubjective} Pending Review`}
            </Badge>
          </div>

          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-[#4C70A6] animate-spin" />
              <p className="text-xs text-slate-500">Evaluating cohort readiness...</p>
            </div>
          ) : publishedData ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-6 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  Results Published to {publishedData.publishedCount} Students!
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Immutable SHA-256 result snapshots are now active and visible on student dashboards.
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <Button variant="primary" size="md" onClick={() => navigate("/dashboard")}>
                  Return to Teacher Dashboard
                </Button>
                <Button variant="outline" size="md" onClick={() => navigate("/audit")}>
                  View Audit Trail
                </Button>
              </div>
            </div>
          ) : (
            <>
              {publishError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs font-mono text-center">
                <div>
                  <span className="text-slate-500">Submissions</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{totalSubmissions}</div>
                </div>
                <div>
                  <span className="text-slate-500">Graded Ready</span>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">{gradedCount} / {totalSubmissions}</div>
                </div>
                <div>
                  <span className="text-slate-500">Pending Review</span>
                  <div className={`text-base font-bold mt-0.5 ${pendingSubjective > 0 ? "text-amber-600" : "text-slate-600"}`}>
                    {pendingSubjective}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Publication Authority:</span>
                  <p className="mt-0.5 text-amber-800">
                    Publishing makes grades and permitted feedback visible to registered students. This action generates cryptographic result hashes and appends immutable audit events.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePublishResults}
                  isLoading={isPublishing}
                  disabled={totalSubmissions === 0 || pendingSubjective > 0}
                  icon={<Send className="w-4 h-4" />}
                >
                  {pendingSubjective > 0
                    ? `Cannot Publish (${pendingSubjective} Pending Review)`
                    : `Publish Results to ${totalSubmissions} Students`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

