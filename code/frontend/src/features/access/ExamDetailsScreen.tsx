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
} from "lucide-react";

export const ExamDetailsScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [registrationState, setRegistrationState] = useState<
    "NOT_REGISTERED" | "REQUEST_PENDING" | "REGISTERED" | "REJECTED"
  >("NOT_REGISTERED");

  // Mock exam detail payload
  const exam = {
    id: examId || "ex-401",
    title: "CS 401 — Distributed Systems & Architecture",
    teacherName: "Dr. Sarah Jenkins",
    department: "Computer Science",
    policy: "APPROVAL_REQUIRED" as const, // PUBLIC, INVITATION_ONLY, APPROVAL_REQUIRED
    durationMinutes: 120,
    totalQuestions: 45,
    totalMarks: 100,
    timingMode: "SECTION_TIMED",
    startDate: "Aug 10, 2026 • 09:00 AM",
    endDate: "Aug 10, 2026 • 11:00 AM",
    registrationWindowEnd: "Aug 09, 2026 • 11:59 PM",
    description:
      "Comprehensive examination covering distributed consensus algorithms (Raft, Paxos), vector clocks, fault tolerance, RPC protocols, and state machine replication. Requires signed desktop launcher application.",
    requirements: [
      "Signed desktop app (Electron) for lockdown environment",
      "Two-device registration cap enforced",
      "Webcam & microphone integrity capture required",
      "Forward-only question navigation policy",
    ],
  };

  const handleRegisterPublic = () => {
    setRegistrationState("REGISTERED");
  };

  return (
    <AppLayout pageTitle={`Exam Details — ${exam.id}`}>
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
                <Badge variant="outline" className="font-mono">{exam.id}</Badge>
                {exam.policy === "PUBLIC" && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Public
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
              {registrationState === "REGISTERED" && (
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="success" className="text-xs py-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    Registration Confirmed
                  </Badge>
                  <Button
                    variant="primary"
                    size="md"
                    className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-medium"
                    onClick={() => navigate(`/exam/${exam.id}/launch`)}
                    icon={<Play className="w-4 h-4" />}
                  >
                    Open Desktop Launch Path
                  </Button>
                </div>
              )}

              {registrationState === "REQUEST_PENDING" && (
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

              {registrationState === "NOT_REGISTERED" && (
                <>
                  {exam.policy === "PUBLIC" && (
                    <Button
                      variant="primary"
                      size="md"
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
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => navigate(`/redeem-invitation`)}
                      icon={<Key className="w-4 h-4 text-slate-600" />}
                    >
                      Redeem Invitation Code
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Exam Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-md border border-slate-200/80">
            <div>
              <div className="text-xs text-slate-500 font-medium">Duration</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1 font-mono">
                <Clock className="w-4 h-4 text-[#4C70A6]" />
                {exam.durationMinutes} Minutes
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium font-mono">Questions</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1 font-mono">
                <BookOpen className="w-4 h-4 text-[#4C70A6]" />
                {exam.totalQuestions} ({exam.totalMarks} Marks)
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Timing Mode</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {exam.timingMode}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Registration Deadline</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1 font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {exam.registrationWindowEnd}
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
