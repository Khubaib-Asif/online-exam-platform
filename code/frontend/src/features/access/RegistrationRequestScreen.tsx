import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { UserCheck, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

export const RegistrationRequestScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [studentNotes, setStudentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 700);
  };

  return (
    <AppLayout pageTitle={`Request Registration — ${examId}`}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/exam/${examId || "ex-401"}`)}
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
                This examination requires explicit instructor approval.
              </p>
            </div>
          </div>

          {isSubmitted ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-5 text-center flex flex-col items-center gap-3 my-4">
              <CheckCircle2 className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Request Submitted Successfully!
                </h3>
                <p className="text-xs text-amber-800 mt-1 max-w-sm">
                  Your request has been routed to <strong>Dr. Sarah Jenkins</strong> for review. You will be notified once a decision is recorded.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/exam/${examId || "ex-401"}/status`)}
              >
                View Request Status
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200/80 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 mb-1">
                  Target Exam: CS 401 — Distributed Systems & Architecture
                </div>
                <div className="text-slate-500">
                  Instructor: Dr. Sarah Jenkins • Registration Policy: Approval Required
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
                  placeholder="e.g. Enrolled in Section 01, requesting exam seating access..."
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
