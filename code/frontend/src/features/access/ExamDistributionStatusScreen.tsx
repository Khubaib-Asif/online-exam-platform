import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Users,
  Key,
  Globe,
  Clock,
  ArrowLeft,
  Share2,
  CheckCircle,
  Copy,
} from "lucide-react";
import { useGetExamDistributionStatusQuery } from "@/redux/services/registrationApi";

export const ExamDistributionStatusScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "ex-401";

  const { data: apiDistribution, isLoading } = useGetExamDistributionStatusQuery(targetId, { skip: !examId });

  const distribution = apiDistribution
    ? {
        examId: apiDistribution.examId,
        examTitle: apiDistribution.title,
        policy: apiDistribution.accessPolicy as any,
        totalRegistered: apiDistribution.approvedCount,
        pendingRequests: apiDistribution.pendingCount,
        rejectedRequests: apiDistribution.rejectedCount,
        invitationsIssued: apiDistribution.invitationsCount,
        invitationsRedeemed: apiDistribution.invitations?.reduce((sum: number, i: any) => sum + i.usedCount, 0) || 0,
        registrationWindowOpen: apiDistribution.isRegistrationOpen,
        registrationWindowEnd: new Date(apiDistribution.registrationClosesAt).toLocaleString(),
      }
    : {
        examId: targetId,
        examTitle: "CS 401 — Distributed Systems & Architecture",
        policy: "APPROVAL_REQUIRED" as const,
        totalRegistered: 28,
        pendingRequests: 2,
        rejectedRequests: 1,
        invitationsIssued: 15,
        invitationsRedeemed: 12,
        registrationWindowOpen: true,
        registrationWindowEnd: "Aug 09, 2026 • 11:59 PM",
      };

  return (
    <AppLayout pageTitle={`Distribution Status — ${distribution.examId}`}>
      <div className="flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/exams")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam List</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Exam Distribution & Registration Status
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {distribution.examTitle} ({distribution.examId})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/registration-requests")}
              icon={<Users className="w-3.5 h-3.5 text-[#4C70A6]" />}
            >
              View Pending Requests ({distribution.pendingRequests})
            </Button>
          </div>
        </div>

        {/* Distribution Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-slate-900">{distribution.totalRegistered}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Total Registered</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-amber-600">{distribution.pendingRequests}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Pending Requests</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-slate-900">{distribution.invitationsRedeemed}/{distribution.invitationsIssued}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Invitations Redeemed</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
            <div className="text-2xl font-bold text-emerald-600">Open</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Registration Window</div>
          </div>
        </div>

        {/* Policy & Window Panel */}
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#4C70A6]" />
            <span>Distribution Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-md border border-slate-200/80">
            <div>
              <div className="text-xs text-slate-500 font-medium">Access Policy</div>
              <div className="mt-1">
                <Badge variant="warning">{distribution.policy.replace("_", " ")}</Badge>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Registration Window Closes</div>
              <div className="text-xs font-bold text-slate-900 mt-1 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {distribution.registrationWindowEnd}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Catalogue Visibility</div>
              <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Published & Discoverable
              </div>
            </div>
          </div>

          {/* Quick Copy Link Box */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">
              Direct Student Registration Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`https://exam-platform.internal/exam/${distribution.examId}`}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => alert("Copied to clipboard!")}
                icon={<Copy className="w-3.5 h-3.5 text-slate-600" />}
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
