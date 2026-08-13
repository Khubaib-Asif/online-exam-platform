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

export const TeacherRegistrationReviewScreen: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [decision, setDecision] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [decisionNotes, setDecisionNotes] = useState("");

  const request = {
    id: requestId || "req-101",
    studentName: "Alex Rivera",
    studentEmail: "alex.rivera@university.edu",
    studentId: "STD-88492",
    registeredDevices: 1,
    examId: "ex-401",
    examTitle: "CS 401 — Distributed Systems & Architecture",
    requestedAt: "Aug 04, 2026 • 10:15 AM",
    studentContext: "Enrolled in Lecture Section 01. Requesting access for mid-term attempt.",
  };

  const handleRecordDecision = (status: "APPROVED" | "REJECTED") => {
    setDecision(status);
  };

  return (
    <AppLayout pageTitle={`Review Request — ${request.id}`}>
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
                ID: {request.studentId} • Registered Devices: {request.registeredDevices}
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-md border border-slate-200/80 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Target Exam
              </h3>
              <div className="text-xs font-semibold text-slate-900">{request.examTitle}</div>
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
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
                Student Request Note:
              </span>
              <p className="text-slate-600 font-mono">{request.studentContext}</p>
            </div>
          )}

          {/* Decision Section */}
          {decision === "PENDING" ? (
            <div className="flex flex-col gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Decision Reason / Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g. Verified against course roster..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleRecordDecision("APPROVED")}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve Registration
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
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
                An auditable entry has been appended to the platform security log.
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
