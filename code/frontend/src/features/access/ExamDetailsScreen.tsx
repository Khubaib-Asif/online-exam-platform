import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  BookOpen,
  Clock,
  Calendar,
  Lock,
  Globe,
  UserCheck,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Key,
  XCircle,
} from "lucide-react";
import { useGetExamDetailsQuery, useRegisterForExamMutation, useRedeemExamInvitationMutation } from "@/redux/services/registrationApi";
import { formatDateTime } from "@/utils/dateTime";

export const ExamDetailsScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const {
    data: apiDetails,
    isLoading,
    isError,
    refetch: refetchDetails,
  } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const [registerForExam, { isLoading: isRegistering }] = useRegisterForExamMutation();
  const [redeemInvitation, { isLoading: isRedeeming }] = useRedeemExamInvitationMutation();

  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegisterPublic = async () => {
    if (!targetId) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await registerForExam(targetId).unwrap();
      refetchDetails();
    } catch (err: any) {
      console.error("Registration error:", err);
      const msg = err.data?.message || err.message || "Failed to submit exam registration.";
      setErrorMessage(msg);
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMessage("Please enter your invitation code.");
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await redeemInvitation({ token: inviteCode.trim(), examId: targetId }).unwrap();
      setSuccessMessage("Invitation redeemed successfully! Your registration is confirmed.");
      setInviteCode("");
      refetchDetails();
    } catch (err: any) {
      console.error("Redemption error:", err);
      const msg = err.data?.message || err.message || "Invitation code is invalid, expired, revoked, or already redeemed.";
      setErrorMessage(msg);
    }
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Loading Exam Details...">
        <div className="max-w-4xl mx-auto p-12 text-center text-slate-500 text-sm">
          Loading examination details...
        </div>
      </AppLayout>
    );
  }

  if (isError || !apiDetails) {
    return (
      <AppLayout pageTitle="Exam Not Found">
        <div className="max-w-4xl mx-auto flex flex-col gap-4 items-center justify-center p-12 bg-white border border-slate-200 rounded-md shadow-2xs">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900">Examination Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm text-center">
            This examination is either not published yet or is unavailable.
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate("/catalogue")}>
            Return to Exam Catalogue
          </Button>
        </div>
      </AppLayout>
    );
  }

  const exam = {
    id: apiDetails.id,
    title: apiDetails.title,
    teacherName: apiDetails.teacherName,
    department: "Examination Department",
    policy: apiDetails.accessPolicy as any,
    durationMinutes: apiDetails.durationMinutes,
    totalQuestions: apiDetails.totalQuestions,
    totalMarks: apiDetails.totalMarks,
    timingMode: apiDetails.timingMode,
    startDate: formatDateTime(apiDetails.startsAt),
    endDate: formatDateTime(apiDetails.closesAt),
    registrationWindowEnd: apiDetails.registrationClosesAt
      ? formatDateTime(apiDetails.registrationClosesAt)
      : "Open",
    description: apiDetails.description || "Official examination assessment session.",
    requirements: [
      "Signed desktop app for lockdown environment",
    ],
  };

  const currentRegistrationState = apiDetails?.registrationState || "NOT_REGISTERED";

  return (
    <AppLayout pageTitle={`Exam Details — ${exam.title}`}>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Back Link */}
        <div>
          <button
            onClick={() => navigate("/catalogue")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam Catalogue</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {exam.policy === "PUBLIC" && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Public Access
                  </Badge>
                )}
                {exam.policy === "APPROVAL_REQUIRED" && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Approval Required
                  </Badge>
                )}
                {exam.policy === "INVITATION_ONLY" && (
                  <Badge variant="info" className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Invitation Only
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {exam.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Instructor: <span className="text-slate-800 font-semibold">{exam.teacherName}</span> • {exam.department}
              </p>
            </div>

            {/* Registration Action Box */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              {currentRegistrationState === "APPROVED" && (() => {
                const nowMs = Date.now();
                const startsAtMs = exam.startsAt ? new Date(exam.startsAt).getTime() : 0;
                const closesAtMs = exam.closesAt ? new Date(exam.closesAt).getTime() : 0;
                const lateGraceMs = (apiDetails?.lateEntryGraceMinutes ?? 15) * 60 * 1000;
                const isBeforeStart = startsAtMs > 0 && nowMs < startsAtMs;
                const isAfterClose = closesAtMs > 0 && nowMs > closesAtMs;
                const isPastLateEntry = startsAtMs > 0 && nowMs > (startsAtMs + lateGraceMs);

                return (
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={isBeforeStart ? "warning" : (isAfterClose || isPastLateEntry) ? "default" : "success"}
                      className="text-xs py-1 px-3"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      {isBeforeStart
                        ? "Registration Approved (Starts Soon)"
                        : isAfterClose
                        ? "Exam Window Closed"
                        : isPastLateEntry
                        ? `Entry Closed (Late > ${apiDetails?.lateEntryGraceMinutes ?? 15}m)`
                        : "Registration Confirmed (Ready)"}
                    </Badge>
                    {!isBeforeStart && !isAfterClose && !isPastLateEntry && (
                      <Button
                        variant="primary"
                        size="md"
                        className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-medium"
                        onClick={() => navigate(`/exam/${exam.id}/launch`)}
                        icon={<Play className="w-4 h-4" />}
                      >
                        Launch Examination
                      </Button>
                    )}
                    {isBeforeStart && (
                      <span className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
                        Exam opens at {new Date(exam.startsAt).toLocaleString()}
                      </span>
                    )}
                    {!isBeforeStart && isPastLateEntry && !isAfterClose && (
                      <span className="text-xs font-mono text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded">
                        Late entry cutoff passed (Allowed within {apiDetails?.lateEntryGraceMinutes ?? 15}m of start)
                      </span>
                    )}
                  </div>
                );
              })()}

              {currentRegistrationState === "REQUESTED" && (
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="warning" className="text-xs py-1 px-3">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                    Pending Teacher Approval
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/exam/${exam.id}/status`)}
                  >
                    Check Status
                  </Button>
                </div>
              )}

              {currentRegistrationState === "REJECTED" && (
                <Badge variant="danger" className="text-xs py-1 px-3">
                  Registration Request Rejected
                </Badge>
              )}

              {currentRegistrationState === "NOT_REGISTERED" && (
                <>
                  {exam.policy === "PUBLIC" && (
                    <Button
                      variant="primary"
                      size="md"
                      isLoading={isRegistering}
                      onClick={handleRegisterPublic}
                    >
                      Register Now
                    </Button>
                  )}

                  {exam.policy === "APPROVAL_REQUIRED" && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate(`/exam/${exam.id}/request`)}
                      icon={<UserCheck className="w-4 h-4" />}
                    >
                      Submit Registration Request
                    </Button>
                  )}

                  {exam.policy === "INVITATION_ONLY" && (
                    <form onSubmit={handleRedeemInvite} className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. INV-8F92-4A"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="bg-slate-50 border border-slate-300 focus:border-[#4C70A6] focus:bg-white rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors w-44"
                      />
                      <Button
                        variant="primary"
                        size="md"
                        type="submit"
                        isLoading={isRedeeming}
                        className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                        icon={<Key className="w-3.5 h-3.5" />}
                      >
                        Redeem & Register
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Registration Successful:</span>
                <p className="mt-0.5 text-emerald-800 leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-900 flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Registration Action Message:</span>
                <p className="mt-0.5 text-red-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Exam Specs & Schedule Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-md border border-slate-200/80">
            <div>
              <div className="text-xs text-slate-500 font-medium">Exam Start Time</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#4C70A6] shrink-0" />
                <span>{exam.startDate}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Exam End Time</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{exam.endDate}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Registration Deadline</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 font-mono text-xs">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{exam.registrationWindowEnd}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Duration</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 font-mono">
                <Clock className="w-4 h-4 text-[#4C70A6] shrink-0" />
                <span>{exam.durationMinutes} Minutes</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium font-mono">Questions & Marks</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5 font-mono">
                <BookOpen className="w-4 h-4 text-[#4C70A6] shrink-0" />
                <span>{exam.totalQuestions} ({exam.totalMarks} Marks)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Timing Mode</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {exam.timingMode}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Description & Syllabus</h3>
            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-md border border-slate-100">
              {exam.description}
            </p>
          </div>

          {/* Security & Gate Requirements */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4C70A6]" />
              <span>Exam Security & Launch Requirements</span>
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
              {exam.requirements.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200/60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4C70A6] shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
