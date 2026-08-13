import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Send, CheckCircle2, ArrowLeft, ShieldCheck, Lock } from "lucide-react";

export const ResultPublicationScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const stats = {
    examId: examId || "ex-401",
    examTitle: "CS 401 — Distributed Systems",
    totalSubmissions: 28,
    gradedCount: 28,
    pendingSubjective: 0,
    averageScore: "84.2%",
  };

  const handlePublishResults = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
    }, 900);
  };

  return (
    <AppLayout pageTitle={`Publish Results — ${stats.examId}`}>
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
                {stats.examTitle} ({stats.examId})
              </p>
            </div>
            <Badge variant="success">All 28 Graded</Badge>
          </div>

          {isPublished ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-6 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  Results Published to Students!
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Immutable result snapshots are now visible on student dashboards.
                </p>
              </div>
              <Button variant="primary" size="md" onClick={() => navigate("/dashboard")}>
                Return to Teacher Dashboard
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Graded Submissions:</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{stats.gradedCount} / {stats.totalSubmissions}</div>
                </div>
                <div>
                  <span className="text-slate-500">Cohort Average Score:</span>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">{stats.averageScore}</div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Publication Authority:</span>
                  <p className="mt-0.5 text-amber-800">
                    Publishing makes grades and permitted feedback visible to registered students. This action records an immutable publication snapshot.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePublishResults}
                  isLoading={isPublishing}
                  icon={<Send className="w-4 h-4" />}
                >
                  Publish Results to Students
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
