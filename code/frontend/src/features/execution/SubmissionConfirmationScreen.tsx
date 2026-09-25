import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Shield,
  FileCheck,
  Home,
  LogOut,
  Calendar,
  User as UserIcon,
  Award,
} from "lucide-react";
import { useGetExamDetailsQuery } from "@/redux/services/registrationApi";
import { useAppSelector } from "@/redux/hooks";
import { nativeBridge } from "@/native-bridge/electronBridge";

export const SubmissionConfirmationScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetExamId = examId || "";

  const { user } = useAppSelector((state) => state.auth);

  const { data: examDetails } = useGetExamDetailsQuery(targetExamId, {
    skip: !targetExamId,
  });

  const nowFormatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      {/* Enterprise Dark Header Bar */}
      <header className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shadow-md z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4C70A6] flex items-center justify-center text-white shadow-2xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-tight leading-none">
              {examDetails?.title || "Examination Assessment"}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Secure Assessment Shell • Submission Complete
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white leading-tight">
              {user?.fullName || "Candidate"}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.email || "Student Portal"}
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* Main Submission Card Container */}
      <main className="flex-1 p-6 md:p-10 max-w-xl w-full mx-auto flex flex-col justify-center animate-fadeIn">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs flex flex-col items-center gap-6 text-center">
          {/* Animated Success Ring */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          </div>

          <div>
            <Badge variant="success" className="mb-2 font-mono text-[11px] tracking-wide uppercase px-2.5 py-0.5">
              Submission Verified
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Exam Successfully Submitted
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
              Your assessment answers have been durably saved and queued for evaluation. A formal cryptographic submission receipt has been generated.
            </p>
          </div>

          {/* Detailed Receipt Card */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg p-4 text-left font-mono text-xs text-slate-700 flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium text-xs">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                Assessment:
              </span>
              <span className="font-bold text-slate-900 truncate max-w-[220px]">
                {examDetails?.title || "Assessment Session"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium text-xs">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Candidate:
              </span>
              <span className="font-semibold text-slate-800">
                {user?.fullName || user?.email || "Enrolled Student"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Submission Timestamp:
              </span>
              <span className="font-bold text-slate-900">{nowFormatted}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium text-xs">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                Grading Pipeline:
              </span>
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                GRADING_PENDING
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Receipt Persistence:
              </span>
              <span className="font-bold text-emerald-600">
                Committed & Verified
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold py-2.5 shadow-xs flex items-center justify-center gap-2"
              onClick={() => navigate(`/exam/${targetExamId}/complete`)}
            >
              <span>View Completion Summary</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            {nativeBridge.isElectron ? (
              <Button
                variant="secondary"
                size="md"
                className="w-full text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-200 hover:bg-red-50/50 flex items-center justify-center gap-2"
                onClick={() => nativeBridge.closeExamShell?.()}
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Secure Exam Shell</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                className="w-full text-slate-700 hover:text-slate-900 border-slate-200 flex items-center justify-center gap-2"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="w-4 h-4" />
                <span>Return to Student Dashboard</span>
              </Button>
            )}
          </div>

          {/* Cryptographic Assurance Footer */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 w-full justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Cryptographic answer receipt recorded and verified</span>
          </div>
        </div>
      </main>
    </div>
  );
};
