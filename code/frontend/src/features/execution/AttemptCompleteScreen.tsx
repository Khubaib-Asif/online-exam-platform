import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@components/ui/Button";
import { Badge } from "@components/ui/Badge";
import {
  Home,
  FileCheck,
  LogOut,
  Shield,
  User as UserIcon,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { nativeBridge } from "@/native-bridge/electronBridge";
import { useAppSelector } from "@/redux/hooks";
import { useGetExamDetailsQuery } from "@/redux/services/registrationApi";

export const AttemptCompleteScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetExamId = examId || "";

  const { user } = useAppSelector((state) => state.auth);
  const { data: examDetails } = useGetExamDetailsQuery(targetExamId, {
    skip: !targetExamId,
  });

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
              Secure Assessment Shell • Session Finished
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

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 md:p-10 max-w-lg w-full mx-auto flex flex-col justify-center animate-fadeIn">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-100 text-[#4C70A6] flex items-center justify-center shadow-inner">
            <FileCheck className="w-9 h-9" />
          </div>

          <div>
            <Badge variant="info" className="mb-2 font-mono text-[11px] uppercase px-2.5 py-0.5">
              Attempt Concluded
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Examination Completed
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
              Your assessment responses have been recorded. Once your submission is processed and reviewed by instructors, results and detailed performance metrics will be available in your portal.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg p-4 text-left text-xs text-slate-700 flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">Responses Durably Saved:</span>
                <span className="text-slate-500 ml-1">
                  All submitted questions are synced with the server.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#4C70A6] mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">Score Release:</span>
                <span className="text-slate-500 ml-1">
                  Automated grading for objective items and instructor evaluation for subjective questions will follow.
                </span>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2.5 mt-2">
            {nativeBridge.isElectron ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold py-2.5 shadow-xs flex items-center justify-center gap-2"
                onClick={() => nativeBridge.closeExamShell?.()}
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Secure Exam Shell</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold py-2.5 shadow-xs flex items-center justify-center gap-2"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="w-4 h-4" />
                <span>Return to Student Dashboard</span>
              </Button>
            )}

            {!nativeBridge.isElectron && (
              <Button
                variant="secondary"
                size="md"
                className="w-full text-slate-600 hover:text-slate-900 border-slate-200"
                onClick={() => navigate("/results")}
              >
                View Published Results
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
