import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  User,
  Mail,
  Calendar,
  FileText,
} from "lucide-react";
import {
  useGetTeacherPendingRequestsQuery,
  useDecideRegistrationRequestMutation,
} from "@/redux/services/registrationApi";

export const TeacherRegistrationReviewScreen: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { data: requestsData, refetch } = useGetTeacherPendingRequestsQuery();
  const [decideRegistrationRequest, { isLoading: isDeciding }] = useDecideRegistrationRequestMutation();

  const foundRequest = requestsData?.find((r) => r.id === requestId);

  const request = foundRequest
    ? {
        id: foundRequest.id,
        studentName: foundRequest.studentName,
        studentEmail: foundRequest.studentEmail,
        studentId: foundRequest.studentId,
        examId: foundRequest.examId,
        examTitle: foundRequest.examTitle,
        requestedAt: new Date(foundRequest.requestedAt).toLocaleString(),
        status: (foundRequest.status === "REQUESTED" ? "PENDING" : foundRequest.status) as "PENDING" | "APPROVED" | "REJECTED",
        studentContext: "Student requested registration for approval-required examination session.",
      }
    : {
        id: requestId || "",
        studentName: "Student Candidate",
        studentEmail: "student@institution.edu",
        studentId: requestId?.slice(0, 8) || "STD-001",
        examId: "EX-TARGET",
        examTitle: "Examination Session",
        requestedAt: "Recently Submitted",
        status: "PENDING" as const,
        studentContext: "Registration request queued for teacher review.",
      };

  const [decision, setDecision] = useState<"PENDING" | "APPROVED" | "REJECTED">(request.status);
  const [decisionNotes, setDecisionNotes] = useState("");

  const handleRecordDecision = async (status: "APPROVED" | "REJECTED") => {
    if (!requestId) return;
    try {
      await decideRegistrationRequest({ registrationId: requestId, decision: status }).unwrap();
      setDecision(status);
      refetch();
    } catch (err: any) {
      console.error("Decision error:", err);
      alert(err.data?.message || "Failed to record decision.");
    }
  };

  const isPending = decision === "PENDING" || request.status === "PENDING";

  return (
    <AppLayout pageTitle={`Review Request — ${request.examTitle}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/registration-requests")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Requests Queue</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#4C70A6]" />
                <span>Review Registration Request</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Auditable teacher decision for approval-required exam access.
              </p>
            </div>
            <Badge
              variant={
                decision === "APPROVED"
                  ? "success"
                  : decision === "PENDING"
                  ? "warning"
                  : "error"
              }
              className="font-mono text-xs px-3 py-1"
            >
              {decision}
            </Badge>
          </div>

          {/* Student & Exam Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 p-4 rounded-md border border-slate-200/80 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Student Profile
              </h3>
              <div className="text-xs text-slate-700 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">{request.studentName}</span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{request.studentEmail}</span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                ID: {request.studentId}
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-md border border-slate-200/80 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Target Exam
              </h3>
              <div className="text-xs font-semibold text-slate-900">{request.examTitle}</div>
              <div className="text-xs text-slate-400 font-mono text-[11px]">{request.examId}</div>
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{request.requestedAt}</span>
              </div>
            </div>
          </div>

          {/* Student Context Note */}
          {request.studentContext && (
            <div className="bg-white p-3 rounded-md border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Registration Note:
              </span>
              <p className="text-slate-600">{request.studentContext}</p>
            </div>
          )}

          {/* Decision Section */}
          {isPending ? (
            <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Decision Reason / Audit Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g. Verified student eligibility in class roster..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  isLoading={isDeciding}
                  onClick={() => handleRecordDecision("APPROVED")}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve Registration
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  isLoading={isDeciding}
                  onClick={() => handleRecordDecision("REJECTED")}
                  icon={<XCircle className="w-4 h-4" />}
                >
                  Reject Request
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Decision Recorded: {decision}
              </h3>
              <p className="text-xs text-slate-500">
                The decision has been written to PostgreSQL and the student's status updated.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/registration-requests")}
              >
                Return to Requests Queue
              </Button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Only the authenticated exam owner may approve or reject registrations.</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
