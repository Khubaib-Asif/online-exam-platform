import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Play,
  ShieldCheck,
} from "lucide-react";
import {
  useGetExamDetailsQuery,
  useGetStudentRegistrationsQuery,
} from "@/redux/services/registrationApi";

export const RegistrationStatusScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const { data: registrationsList } = useGetStudentRegistrationsQuery();

  const activeReg = registrationsList?.find((r) => r.examId === targetId || r.id === targetId);

  const teacherName = activeReg?.teacherName || apiDetails?.teacherName || "Instructor";
  const examTitle = activeReg?.examTitle || apiDetails?.title || "Examination";
  const rawStatus = activeReg?.status || apiDetails?.registrationState || "REQUESTED";

  const status: "REGISTERED" | "REQUEST_PENDING" | "REJECTED" | "REVOKED" =
    rawStatus === "APPROVED"
      ? "REGISTERED"
      : rawStatus === "REQUESTED"
      ? "REQUEST_PENDING"
      : rawStatus === "REJECTED"
      ? "REJECTED"
      : "REVOKED";

  const requestedAt = activeReg?.requestedAt
    ? new Date(activeReg.requestedAt).toLocaleString()
    : "Recently Submitted";
  const reviewedAt = activeReg?.approvedAt
    ? new Date(activeReg.approvedAt).toLocaleString()
    : null;

  const notes =
    status === "REQUEST_PENDING"
      ? "Awaiting instructor verification of student eligibility."
      : status === "REGISTERED"
      ? "Registration confirmed. Student eligible for paper launch."
      : "Registration request processed.";

  const renderStatusCard = () => {
    switch (status) {
      case "REGISTERED":
        return (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-6 text-left flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-base font-bold text-emerald-900">Registration Approved</h3>
            </div>
            <p className="text-xs text-emerald-700">
              Your registration request has been approved by {teacherName}. You are fully eligible to launch the exam when the scheduled window opens.
            </p>
            <div className="mt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/exam/${targetId}/launch`)}
                icon={<Play className="w-4 h-4" />}
              >
                Proceed to Desktop Launch
              </Button>
            </div>
          </div>
        );
      case "REJECTED":
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-left flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-base font-bold text-red-900">Registration Declined</h3>
            </div>
            <p className="text-xs text-red-700">
              Your registration request was declined by {teacherName}. If you believe this is an error, please contact your instructor.
            </p>
          </div>
        );
      case "REVOKED":
        return (
          <div className="bg-slate-100 border border-slate-300 rounded-md p-6 text-left flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-slate-600" />
              <h3 className="text-base font-bold text-slate-900">Access Revoked</h3>
            </div>
            <p className="text-xs text-slate-600">
              Registration access for this examination was revoked by system policy or instructor action.
            </p>
          </div>
        );
      case "REQUEST_PENDING":
      default:
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-6 text-left flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
              <h3 className="text-base font-bold text-amber-900">Awaiting Teacher Decision</h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Your registration request has been submitted and is currently pending review by{" "}
              <strong>{teacherName}</strong>. You will be able to launch the exam once approved.
            </p>
          </div>
        );
    }
  };

  return (
    <AppLayout pageTitle={`Registration Status — ${examTitle}`}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/exam/${targetId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam Details</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Registration Status</h1>
              <p className="text-xs text-slate-500 mt-1">{examTitle}</p>
            </div>
            <Badge
              variant={
                status === "REGISTERED"
                  ? "success"
                  : status === "REQUEST_PENDING"
                  ? "warning"
                  : "error"
              }
              className="text-xs px-3 py-1 font-mono"
            >
              {status}
            </Badge>
          </div>

          {renderStatusCard()}

          {/* Timeline Details */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200/70 text-xs text-slate-700 flex flex-col gap-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Requested Date:</span>
              <span className="font-semibold text-slate-900">{requestedAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Instructor:</span>
              <span className="font-semibold text-slate-900">{teacherName}</span>
            </div>
            {reviewedAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reviewed Date:</span>
                <span className="font-semibold text-slate-900">{reviewedAt}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Status Notes:</span>
              <span className="font-semibold text-slate-900">{notes}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              PostgreSQL verified registration status
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/catalogue")}
            >
              Return to Catalogue
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
