import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Users,
  Key,
  Clock,
  ArrowLeft,
  Share2,
  Copy,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import {
  useGetExamDetailsQuery,
  useGetExamDistributionStatusQuery,
} from "@/redux/services/examBuilderApi";

export const M4DistributionStatusScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const { data: distData } = useGetExamDistributionStatusQuery(targetId, { skip: !targetId });

  const [copiedLink, setCopiedLink] = useState(false);
  const directLink = `${window.location.origin}/exam/${targetId}`;

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const policy = distData?.accessPolicy || apiDetails?.accessPolicy || "APPROVAL_REQUIRED";
  const approvedCount = distData?.approvedCount ?? 0;
  const pendingCount = distData?.pendingCount ?? 0;
  const rejectedCount = distData?.rejectedCount ?? 0;
  const invitationsCount = distData?.invitationsCount ?? 0;
  const invitations = distData?.invitations || [];
  const totalInvitationsRedeemed = invitations.reduce((sum: number, i: any) => sum + (i.usedCount || 0), 0);

  const isPublished = apiDetails?.status === "PUBLISHED";

  return (
    <AppLayout pageTitle={`Exam Distribution — ${apiDetails?.title || targetId}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/exams")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam List</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isPublished ? "success" : "warning"}>
                  {isPublished ? "Published Revision" : "Draft Revision"}
                </Badge>
                <span className="font-mono text-xs text-slate-400">ID: {targetId}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Exam Distribution Status</h1>
              <p className="text-xs text-slate-500 mt-1">{apiDetails?.title}</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/registration-requests")}
              icon={<Users className="w-3.5 h-3.5 text-[#4C70A6]" />}
            >
              Manage Requests ({pendingCount})
            </Button>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">Catalogue State</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {isPublished ? "Published & Discoverable" : "Draft (Hidden)"}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium">Access Policy</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {policy.replace("_", " ")}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium">Active Candidate Registrations</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {approvedCount} Approved ({pendingCount} Pending)
              </div>
            </div>
          </div>

          {/* Direct Link Copy Box */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">
              Direct Candidate Registration Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directLink}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCopyLink(directLink)}
                icon={<Copy className="w-3.5 h-3.5 text-slate-600" />}
              >
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>

          {/* Issued Invitations List if INVITATION_ONLY */}
          {policy === "INVITATION_ONLY" && invitations.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#4C70A6]" />
                <span>Issued Access Invitations ({invitations.length})</span>
              </h4>

              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {invitations.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-3 font-mono">
                      <Badge variant="outline">{inv.recipientEmail || "Class Code"}</Badge>
                      <span className="font-bold text-slate-800">
                        Redeemed: {inv.usedCount} / {inv.maxUses}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyLink(`${window.location.origin}/redeem-invitation?code=${inv.id}`)}
                      className="text-[#4C70A6] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Live candidate metrics synced with PostgreSQL database.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/builder/${targetId}`)}
            >
              Back to Builder
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
