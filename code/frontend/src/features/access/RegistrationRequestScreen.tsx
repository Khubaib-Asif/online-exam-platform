import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { UserCheck, ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import {
  useGetExamDetailsQuery,
  useRegisterForExamMutation,
} from "@/redux/services/registrationApi";

export const RegistrationRequestScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetExamId = examId || "";

  const { data: apiDetails } = useGetExamDetailsQuery(targetExamId, { skip: !targetExamId });
  const [registerForExam, { isLoading: isSubmitting }] = useRegisterForExamMutation();

  const [studentNotes, setStudentNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teacherName = apiDetails?.teacherName || "Instructor";
  const examTitle = apiDetails?.title || "Examination";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExamId) return;
    setError(null);

    try {
      await registerForExam(targetExamId).unwrap();
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Registration request error:", err);
      const msg = err.data?.message || err.message || "Failed to submit registration request.";
      setError(msg);
    }
  };

  return (
    <AppLayout pageTitle={`Request Registration — ${examTitle}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/exam/${targetExamId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam Details</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Submit Registration Request
              </h1>
              <p className="text-xs text-slate-500">
                This examination requires explicit instructor approval before launch.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSubmitted ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-5 text-center flex flex-col items-center gap-3 my-4">
              <CheckCircle2 className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Request Submitted Successfully!
                </h3>
                <p className="text-xs text-amber-800 mt-1 max-w-sm">
                  Your request has been routed to <strong>{teacherName}</strong> for review. You will be able to launch the paper once your request is approved.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/exam/${targetExamId}/status`)}
              >
                View Request Status
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200/80 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 mb-1">
                  Target Exam: {examTitle}
                </div>
                <div className="text-slate-500">
                  Instructor: <span className="font-medium text-slate-800">{teacherName}</span> • Registration Policy: Approval Required
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message / Context for Instructor (Optional)
                </label>
                <textarea
                  rows={4}
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="e.g. Enrolled in class section, requesting exam seating access..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full"
                  icon={<Send className="w-4 h-4" />}
                >
                  Send Registration Request
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
