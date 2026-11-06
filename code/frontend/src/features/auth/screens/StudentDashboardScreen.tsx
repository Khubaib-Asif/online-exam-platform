import React from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { useAppSelector } from "@redux/hooks";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Calendar, Clock, Play, BookOpen, RefreshCw, Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useGetStudentRegistrationsQuery,
  useGetExamCatalogueQuery,
  type StudentRegistrationItem,
} from "@/redux/services/registrationApi";
import { useGetStudentResultsQuery } from "@/redux/services/gradingApi";
import { formatDateTime, getTimeGreeting } from "@/utils/dateTime";

export const StudentDashboardScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const greeting = getTimeGreeting();
  const studentName =
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user?.email?.split('@')[0] ||
    "Student";

  const {
    data: registrations = [],
    isLoading: isRegLoading,
    refetch: refetchRegs,
  } = useGetStudentRegistrationsQuery();

  const {
    data: results = [],
    isLoading: isResultsLoading,
    refetch: refetchResults,
  } = useGetStudentResultsQuery();

  const { data: catalogue = [] } = useGetExamCatalogueQuery();

  const approvedRegistrations = registrations.filter((r) => r.status === "APPROVED");
  const pendingRegistrations = registrations.filter((r) => r.status === "REQUESTED");

  const stats = [
    { label: "Approved Exams", value: approvedRegistrations.length },
    { label: "Pending Approval", value: pendingRegistrations.length },
    { label: "Catalogue Available", value: catalogue.length },
    { label: "Results Published", value: results.length },
  ];

  const isLoading = isRegLoading || isResultsLoading;

  const handleRefresh = () => {
    refetchRegs();
    refetchResults();
  };

  return (
    <AppLayout pageTitle="Student Dashboard">
      <div className="flex flex-col gap-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {greeting}, {studentName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Access your registered examinations, schedules, and published results.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>

        {/* 4 Live Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs text-left"
            >
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Registered / Upcoming Exams Section */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4C70A6]" />
              <span>My Registered Examinations</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/catalogue")}
              className="text-xs text-[#4C70A6] hover:underline flex items-center gap-1"
            >
              <span>Explore Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-[#4C70A6]" />
              <span>Loading registered exams...</span>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-3 border border-dashed border-slate-200 rounded-md">
              <BookOpen className="w-8 h-8 text-slate-300" />
              <div>
                <h3 className="text-sm font-semibold text-slate-700">No Exam Registrations Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  You have not registered for any exams. Browse the public catalogue or redeem an invitation code.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                onClick={() => navigate("/catalogue")}
              >
                Browse Exam Catalogue
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {registrations.map((exam: StudentRegistrationItem) => {
                const isApproved = exam.status === "APPROVED";
                const isPending = exam.status === "REQUESTED";
                const isRejected = exam.status === "REJECTED";

                const isSubmitted =
                  exam.sessionStatus === "SUBMITTED" ||
                  exam.sessionStatus === "AUTO_SUBMITTED" ||
                  exam.sessionStatus === "GRADED" ||
                  exam.sessionStatus === "PUBLISHED" ||
                  exam.sessionStatus === "TERMINATED";

                const nowMs = Date.now();
                const startsAtMs = exam.startsAt ? new Date(exam.startsAt).getTime() : 0;
                const closesAtMs = exam.closesAt ? new Date(exam.closesAt).getTime() : 0;
                const regCloseMs = exam.registrationClosesAt ? new Date(exam.registrationClosesAt).getTime() : 0;

                const isBeforeStart = startsAtMs > 0 && nowMs < startsAtMs;
                const isAfterClose = closesAtMs > 0 && nowMs > closesAtMs;
                const isRegistrationClosed = (regCloseMs > 0 && nowMs > regCloseMs) || (startsAtMs > 0 && nowMs > startsAtMs);

                const isStartedSession = exam.sessionStatus === "ACTIVE" || exam.sessionStatus === "PAUSED_RECONNECT";
                const lateGraceMs = (exam.lateEntryGraceMinutes ?? 15) * 60 * 1000;
                const isPastLateEntry = !isStartedSession && startsAtMs > 0 && nowMs > (startsAtMs + lateGraceMs);

                const canLaunch = isApproved && !isSubmitted && !isBeforeStart && !isAfterClose && !isPastLateEntry;

                const badgeVariant = isSubmitted
                  ? ("info" as const)
                  : isApproved
                  ? isBeforeStart
                    ? ("warning" as const)
                    : isAfterClose
                    ? ("default" as const)
                    : isPastLateEntry
                    ? ("error" as const)
                    : ("success" as const)
                  : isPending
                  ? isRegistrationClosed
                    ? ("default" as const)
                    : ("warning" as const)
                  : ("error" as const);

                const statusLabel = isSubmitted
                  ? "Submitted / Completed"
                  : isApproved
                  ? isBeforeStart
                    ? "Approved (Starts Soon)"
                    : isAfterClose
                    ? "Exam Closed"
                    : isPastLateEntry
                    ? `Entry Window Closed (Late > ${exam.lateEntryGraceMinutes ?? 15}m)`
                    : "Ready to Launch"
                  : isPending
                  ? isRegistrationClosed
                    ? "Registration Window Ended"
                    : "Pending Approval"
                  : isRejected
                  ? "Registration Rejected"
                  : exam.status;

                return (
                  <div
                    key={exam.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-md transition-colors gap-3"
                  >
                    <div className="flex flex-col gap-1 text-left">
                      <span className="font-semibold text-sm text-slate-900">
                        {exam.examTitle}
                      </span>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 font-mono">
                        <span className="text-slate-600 font-sans">
                          Instructor: {exam.teacherName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Starts: {formatDateTime(exam.startsAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <Badge variant={badgeVariant}>{statusLabel}</Badge>
                      {canLaunch && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                          icon={<Play className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/exam/${exam.examId}/launch`)}
                        >
                          Launch Exam
                        </Button>
                      )}
                      {isApproved && isBeforeStart && !isSubmitted && (
                        <span className="text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                          Opens at {new Date(exam.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Published Results Card if Available */}
        {results.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {results.length} Published Exam {results.length === 1 ? "Result" : "Results"} Available
                </h3>
                <p className="text-xs text-slate-500">
                  View your final confirmed scores, percentage grades, and teacher feedback.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/results")}
              className="text-xs"
            >
              View Results
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
