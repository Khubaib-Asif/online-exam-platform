import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { CheckCircle2, FileCheck, ArrowRight, ShieldCheck } from "lucide-react";

export const SubmissionConfirmationScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="Submission Confirmation">
      <div className="max-w-md mx-auto flex flex-col gap-6 text-center">
        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <Badge variant="success" className="mb-2">SUBMITTED</Badge>
            <h1 className="text-xl font-bold text-slate-900">Exam Submission Confirmed</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your exam answers have been durably persisted and routed to the grading queue.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-left font-mono text-xs text-slate-700 flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Exam:</span>
              <span className="font-bold text-slate-900">{examId || "ex-401"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Questions Answered:</span>
              <span className="font-bold text-emerald-700">45 / 45</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Submission Timestamp:</span>
              <span className="font-bold text-slate-900">Aug 04, 2026 11:40 AM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Grading Status:</span>
              <span className="font-bold text-amber-600">GRADING_PENDING</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
            onClick={() => navigate(`/exam/${examId || "ex-401"}/complete`)}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Complete & Exit Exam Shell
          </Button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Immutable answer snapshot recorded in PostgreSQL</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
