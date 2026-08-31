import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { CheckCircle2, Send, ArrowLeft, AlertTriangle, Lock, XCircle } from "lucide-react";
import { useGetExamDetailsQuery, usePublishExamMutation } from "@/redux/services/examBuilderApi";

export const PublishExamScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails, refetch: refetchDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const [publishExamApi, { isLoading: isPublishing }] = usePublishExamMutation();

  const [isPublished, setIsPublished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sections = apiDetails?.sections || [];
  const totalQuestions = sections.reduce((sum, sec) => sum + sec.questions.length, 0);
  const totalMarks = sections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qSum, q) => qSum + q.marks, 0),
    0
  );

  const isExamAlreadyPublished = apiDetails?.status === "PUBLISHED";

  const handlePublish = async () => {
    if (!targetId) return;
    setErrorMessage(null);

    try {
      await publishExamApi(targetId).unwrap();
      setIsPublished(true);
      refetchDetails();
    } catch (err: any) {
      console.error("Publish error:", err);
      const msg = err.data?.error?.message || err.data?.message || err.message || "Failed to publish exam revision.";
      setErrorMessage(msg);
      setIsPublished(false);
    }
  };

  return (
    <AppLayout pageTitle={`Publish Exam — ${apiDetails?.title || targetId}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
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
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-[#4C70A6]" />
                <span>Publish Exam Revision</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Exam: <span className="font-semibold text-slate-900">{apiDetails?.title}</span> • ID:{" "}
                <span className="font-mono text-slate-400">{targetId}</span>
              </p>
            </div>
            <Badge variant={isExamAlreadyPublished || isPublished ? "success" : "warning"}>
              {isExamAlreadyPublished || isPublished ? "PUBLISHED" : `Revision v${apiDetails?.revisionNumber || 1} Draft`}
            </Badge>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-900 flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Publication Failed:</span>
                <p className="mt-0.5 text-red-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {isPublished || isExamAlreadyPublished ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-6 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  Exam Revision Frozen & Published!
                </h3>
                <p className="text-xs text-emerald-700 mt-1 max-w-md">
                  This examination revision has been frozen into PostgreSQL. Content hash, question versions, and access rules are locked into immutable state.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(`/builder/${targetId}`)}
                >
                  View Locked Builder
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/builder/${targetId}/settings`)}
                >
                  View Distribution Settings
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Live Structure Validation Checklist */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Publication Invariants Validation Checklist
                </h3>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs">
                    <div className="flex items-center gap-2">
                      {sections.length > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-900">Sections Count</span>
                    </div>
                    <span className="font-mono text-slate-700 font-bold">{sections.length} Sections Configured</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs">
                    <div className="flex items-center gap-2">
                      {totalQuestions > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-900">Total Questions Linked</span>
                    </div>
                    <span className="font-mono text-slate-700 font-bold">{totalQuestions} Questions ({totalMarks} Total Points)</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">Timing Mode & Paper Duration</span>
                    </div>
                    <span className="font-mono text-slate-700 font-bold">
                      {apiDetails?.timingMode || "WHOLE_PAPER"} • {apiDetails?.durationMinutes || 120} Mins
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">Access Policy</span>
                    </div>
                    <span className="font-mono text-slate-700 font-bold">{apiDetails?.accessPolicy || "APPROVAL_REQUIRED"}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Publication Freeze Warning:</span>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    Publishing freezes all attached question versions, section structures, and timing rules into an immutable revision in PostgreSQL.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Status: Ready for revision freeze</span>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePublish}
                  isLoading={isPublishing}
                  disabled={sections.length === 0 || totalQuestions === 0}
                  icon={<Send className="w-4 h-4" />}
                >
                  Freeze & Publish Revision
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
