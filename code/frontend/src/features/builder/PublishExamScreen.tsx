import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { CheckCircle2, Send, ArrowLeft, ShieldCheck, AlertCircle, Lock } from "lucide-react";

export const PublishExamScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const validationChecklist = [
    { label: "Teacher Ownership Check", passed: true, detail: "Authenticated teacher owns this exam." },
    { label: "Immutable Question Version Resolution", passed: true, detail: "All 45 question versions resolved from M3." },
    { label: "Timing Invariants Check", passed: true, detail: "Section duration sum equals paper duration (120 mins)." },
    { label: "Navigation Policy Check", passed: true, detail: "FORWARD_ONLY navigation configured." },
    { label: "Registration Policy Check", passed: true, detail: "APPROVAL_REQUIRED access policy validated." },
  ];

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
    }, 900);
  };

  return (
    <AppLayout pageTitle={`Publish Exam — ${examId || "ex-401"}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/builder/${examId || "ex-401"}`)}
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
                Exam ID: <span className="font-mono font-bold text-slate-800">{examId || "ex-401"}</span>
              </p>
            </div>
            <Badge variant="warning">Revision Draft v3</Badge>
          </div>

          {isPublished ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-6 text-center flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  Exam Published Successfully!
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Revision v3 is now frozen and published to the catalogue according to your registration policy.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="mt-2"
                onClick={() => navigate(`/builder/${examId || "ex-401"}/distribution`)}
              >
                View Distribution Status
              </Button>
            </div>
          ) : (
            <>
              {/* Validation Checklist */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Publication Invariants Validation Checklist
                </h3>

                <div className="flex flex-col gap-2">
                  {validationChecklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-900">{item.label}</span>
                      </div>
                      <span className="font-mono text-slate-500">{item.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Publication Freeze Warning:</span>
                  <p className="mt-0.5 text-amber-800">
                    Publishing freezes question version references, sections, timing, and policies into an immutable revision. Future changes will create revision v4.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Status: Ready to freeze</span>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePublish}
                  isLoading={isPublishing}
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
