import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Calendar,
  Lock,
  Globe,
  UserCheck,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export interface CatalogueExamItem {
  id: string;
  title: string;
  teacherName: string;
  policy: "PUBLIC" | "INVITATION_ONLY" | "APPROVAL_REQUIRED";
  durationMinutes: number;
  totalQuestions: number;
  startDate: string;
  endDate: string;
  registrationState: "NOT_REGISTERED" | "REQUEST_PENDING" | "REGISTERED" | "REJECTED" | "EXPIRED";
}

const mockExams: CatalogueExamItem[] = [
  {
    id: "ex-401",
    title: "CS 401 — Distributed Systems & Architecture",
    teacherName: "Dr. Sarah Jenkins",
    policy: "APPROVAL_REQUIRED",
    durationMinutes: 120,
    totalQuestions: 45,
    startDate: "Aug 10, 2026 09:00 AM",
    endDate: "Aug 10, 2026 11:00 AM",
    registrationState: "NOT_REGISTERED",
  },
  {
    id: "ex-202",
    title: "MATH 202 — Advanced Multivariable Calculus",
    teacherName: "Prof. Robert Vance",
    policy: "PUBLIC",
    durationMinutes: 90,
    totalQuestions: 30,
    startDate: "Aug 12, 2026 02:00 PM",
    endDate: "Aug 12, 2026 03:30 PM",
    registrationState: "REGISTERED",
  },
  {
    id: "ex-305",
    title: "PHYS 305 — Quantum Mechanics Fundamentals",
    teacherName: "Dr. Elena Rostova",
    policy: "INVITATION_ONLY",
    durationMinutes: 150,
    totalQuestions: 50,
    startDate: "Aug 15, 2026 10:00 AM",
    endDate: "Aug 15, 2026 12:30 PM",
    registrationState: "NOT_REGISTERED",
  },
  {
    id: "ex-101",
    title: "ENG 101 — Academic Writing & Critical Thinking",
    teacherName: "Prof. Alan Turing",
    policy: "PUBLIC",
    durationMinutes: 60,
    totalQuestions: 20,
    startDate: "Aug 18, 2026 01:00 PM",
    endDate: "Aug 18, 2026 02:00 PM",
    registrationState: "REQUEST_PENDING",
  },
];

export const ExamCatalogueScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [policyFilter, setPolicyFilter] = useState<string>("ALL");

  const filteredExams = mockExams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPolicy = policyFilter === "ALL" || exam.policy === policyFilter;
    return matchesSearch && matchesPolicy;
  });

  const getPolicyBadge = (policy: CatalogueExamItem["policy"]) => {
    switch (policy) {
      case "PUBLIC":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            <span>Public Access</span>
          </Badge>
        );
      case "APPROVAL_REQUIRED":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            <span>Approval Required</span>
          </Badge>
        );
      case "INVITATION_ONLY":
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Invitation Only</span>
          </Badge>
        );
    }
  };

  const getStatusBadge = (state: CatalogueExamItem["registrationState"]) => {
    switch (state) {
      case "REGISTERED":
        return <Badge variant="success">Registered</Badge>;
      case "REQUEST_PENDING":
        return <Badge variant="warning">Pending Approval</Badge>;
      case "REJECTED":
        return <Badge variant="error">Rejected</Badge>;
      case "EXPIRED":
        return <Badge variant="default">Closed</Badge>;
      case "NOT_REGISTERED":
      default:
        return <Badge variant="outline">Not Registered</Badge>;
    }
  };

  return (
    <AppLayout pageTitle="Exam Catalogue">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Exam Catalogue
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Browse published examinations, check access policies, and manage registrations.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/redeem-invitation")}
            icon={<Lock className="w-3.5 h-3.5 text-slate-600" />}
          >
            Redeem Invitation Code
          </Button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search exam or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 shrink-0">Policy:</span>
            {["ALL", "PUBLIC", "APPROVAL_REQUIRED", "INVITATION_ONLY"].map((filter) => (
              <button
                key={filter}
                onClick={() => setPolicyFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  policyFilter === filter
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter === "ALL" ? "All Policies" : filter.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Catalogue Cards Grid */}
        {filteredExams.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center shadow-2xs">
            <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No examinations found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No published examinations match your search or selected access policy filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white border border-slate-200 rounded-md p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {exam.title}
                    </h3>
                    {getStatusBadge(exam.registrationState)}
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    Instructor: <span className="text-slate-700 font-semibold">{exam.teacherName}</span>
                  </p>

                  <div className="flex items-center gap-2 my-1">
                    {getPolicyBadge(exam.policy)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-md border border-slate-100 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.durationMinutes} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.startDate}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">ID: {exam.id}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/exam/${exam.id}`)}
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
