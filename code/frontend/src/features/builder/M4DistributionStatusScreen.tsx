import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  Users,
  Key,
  Clock,
  ArrowLeft,
  Share2,
  Copy,
  ShieldCheck,
  CheckCircle,
  Mail,
  PlusCircle,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ExternalLink,
  Edit2,
} from "lucide-react";
import {
  useGetExamDetailsQuery,
  useGetExamDistributionStatusQuery,
  useCreateExamInvitationMutation,
  useRevokeExamInvitationMutation,
} from "@/redux/services/examBuilderApi";

export const M4DistributionStatusScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const { data: distData, refetch: refetchDist } = useGetExamDistributionStatusQuery(targetId, { skip: !targetId });
  const [createInvitationApi, { isLoading: isCreatingInvite }] = useCreateExamInvitationMutation();
  const [revokeInvitationApi, { isLoading: isRevoking }] = useRevokeExamInvitationMutation();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Invitation creation state
  const [inviteType, setInviteType] = useState<"CLASS_CODE" | "EMAIL">("CLASS_CODE");
  const [customCode, setCustomCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(apiDetails?.capacity || 100);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [editedLimit, setEditedLimit] = useState<number>(100);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    code: string;
    link: string;
    email?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const policy = distData?.accessPolicy || apiDetails?.accessPolicy || "APPROVAL_REQUIRED";
  const approvedCount = distData?.approvedCount ?? 0;
  const pendingCount = distData?.pendingCount ?? 0;
  const rejectedCount = distData?.rejectedCount ?? 0;
  const invitations = distData?.invitations || [];
  const isPublished = apiDetails?.status === "PUBLISHED";

  const directLink = `${window.location.origin}/exam/${targetId}`;

  const handleCopyLink = (text: string, idKey?: string) => {
    navigator.clipboard.writeText(text);
    if (idKey) {
      setCopiedCodeId(idKey);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;
    setErrorMessage(null);

    try {
      const payload: any = {
        examId: targetId,
      };

      if (inviteType === "EMAIL") {
        if (!inviteEmail.trim()) {
          setErrorMessage("Please enter a valid student email address.");
          return;
        }
        payload.recipientEmail = inviteEmail.trim();
        payload.maxUses = 1;
      } else {
        payload.maxUses = inviteMaxUses > 0 ? inviteMaxUses : 30;
        if (customCode.trim()) {
          payload.customCode = customCode.trim();
        }
      }

      const res: any = await createInvitationApi(payload).unwrap();
      const code = res?.data?.code || res?.data?.rawToken || res?.code || res?.rawToken || "INV-CODE";
      const link = `${window.location.origin}/redeem-invitation?code=${code}`;

      setGeneratedInvite({
        code,
        link,
        email: payload.recipientEmail,
      });

      setInviteEmail("");
      setCustomCode("");
      refetchDist();
    } catch (err: any) {
      console.error("Failed to create invitation:", err);
      setErrorMessage(err.data?.message || err.message || "Failed to create invitation.");
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation code? Candidates will no longer be able to use it.")) {
      return;
    }

    try {
      await revokeInvitationApi({ examId: targetId, invitationId }).unwrap();
      refetchDist();
    } catch (err: any) {
      console.error("Failed to revoke invitation:", err);
      alert(err.data?.message || err.message || "Failed to revoke invitation.");
    }
  };

  const activeClassInvite = invitations.find(
    (inv: any) => !inv.recipientEmail && !inv.revokedAt && new Date(inv.expiresAt) > new Date()
  );

  const handleSaveClassLimit = async () => {
    if (!activeClassInvite) return;
    if (editedLimit < (activeClassInvite.usedCount || 0)) {
      alert(`Capacity cannot be less than current redeemed count (${activeClassInvite.usedCount}).`);
      return;
    }
    setIsUpdatingLimit(true);
    try {
      await createInvitationApi({
        examId: targetId,
        maxUses: editedLimit,
      }).unwrap();
      setIsEditingLimit(false);
      refetchDist();
    } catch (err: any) {
      alert(err.data?.message || err.message || "Failed to update capacity limit.");
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const handleRegenerateClassCode = async () => {
    if (!confirm("Are you sure you want to regenerate the class invitation code? The previous code will be revoked immediately.")) {
      return;
    }
    setErrorMessage(null);
    try {
      const res: any = await createInvitationApi({
        examId: targetId,
        maxUses: activeClassInvite?.maxUses || apiDetails?.capacity || 100,
        regenerate: true,
      }).unwrap();

      const code = res?.data?.code || res?.data?.rawToken || res?.code || res?.rawToken || "INV-CODE";
      const link = `${window.location.origin}/redeem-invitation?code=${code}`;

      setGeneratedInvite({
        code,
        link,
      });
      refetchDist();
    } catch (err: any) {
      console.error("Failed to regenerate code:", err);
      setErrorMessage(err.data?.message || err.message || "Failed to regenerate class code.");
    }
  };

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
              </div>
              <h1 className="text-xl font-bold text-slate-900">Exam Distribution Status</h1>
              <p className="text-xs text-slate-500 mt-1">{apiDetails?.title}</p>
            </div>

            {policy === "APPROVAL_REQUIRED" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/registration-requests")}
                icon={<Users className="w-3.5 h-3.5 text-[#4C70A6]" />}
              >
                Manage Requests ({pendingCount})
              </Button>
            )}
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">Catalogue State</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {isPublished ? "Published & Active" : "Draft (Hidden)"}
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
                {approvedCount} Approved {policy === "APPROVAL_REQUIRED" ? `(${pendingCount} Pending)` : ""}
              </div>
            </div>
          </div>

          {/* Direct Link Copy Box for PUBLIC and APPROVAL_REQUIRED */}
          {policy !== "INVITATION_ONLY" && (
            <div className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-md border border-slate-200">
              <label className="text-xs font-semibold text-slate-700">
                {policy === "PUBLIC" ? "Direct Candidate Registration Link" : "Candidate Access Request Link"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={directLink}
                  className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-700 select-all"
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
              <span className="text-[11px] text-slate-500">
                {policy === "PUBLIC"
                  ? "Share this direct link for 1-click candidate self-registration."
                  : "Candidates opening this link can submit early access approval requests."}
              </span>
            </div>
          )}

          {/* INVITATION ONLY MANAGEMENT HUB */}
          {policy === "INVITATION_ONLY" && (
            <div className="flex flex-col gap-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#4C70A6]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Invitation Codes & Access Distribution Hub
                  </h3>
                </div>
                <Badge variant="info">Single Active Class Code Active</Badge>
              </div>

              {/* 1. Primary Active Class Code Card */}
              {activeClassInvite ? (
                <div className="bg-slate-50 border border-slate-300 rounded-md p-4 flex flex-col gap-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#4C70A6]" />
                      <span className="text-xs font-bold text-slate-900">
                        Active Class Invitation Code
                      </span>
                    </div>
                    <Badge variant="info">Code-Only Access</Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded border border-slate-200">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Class Code:</span>
                        <span className="font-mono font-bold text-base text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-300 tracking-wider">
                          {activeClassInvite.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Share this code with your class. Students enter this code on the Catalogue page using <strong>"Redeem Invitation Code"</strong>.
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-medium">
                        <span>
                          Redeemed: <strong className="text-slate-900">{activeClassInvite.usedCount} / {activeClassInvite.maxUses}</strong> students
                        </span>
                        {!isEditingLimit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditedLimit(activeClassInvite.maxUses);
                              setIsEditingLimit(true);
                            }}
                            className="text-[#4C70A6] hover:underline font-semibold flex items-center gap-1 cursor-pointer ml-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Capacity</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 ml-2">
                            <input
                              type="number"
                              min={activeClassInvite.usedCount || 1}
                              max={5000}
                              value={editedLimit}
                              onChange={(e) => setEditedLimit(Number(e.target.value))}
                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono"
                            />
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              isLoading={isUpdatingLimit}
                              onClick={handleSaveClassLimit}
                              className="text-[11px] py-0.5 px-2 bg-[#4C70A6] text-white"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingLimit(false)}
                              className="text-[11px] py-0.5 px-1.5"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyLink(activeClassInvite.code, "CLASS_ACTIVE")}
                        icon={<Copy className="w-3.5 h-3.5 text-[#4C70A6]" />}
                      >
                        {copiedCodeId === "CLASS_ACTIVE" ? "Copied!" : "Copy Code"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleRegenerateClassCode}
                        isLoading={isCreatingInvite}
                      >
                        Regenerate
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(activeClassInvite.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-600 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Generate Initial Class Code Box */
                <div className="bg-[#4C70A6]/5 border border-[#4C70A6]/30 rounded-md p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#4C70A6]/20 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <PlusCircle className="w-4 h-4 text-[#4C70A6]" />
                      <span>Generate Class Invitation Code</span>
                    </div>
                  </div>

                  <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Custom Code (Optional, e.g. MATH101)
                      </label>
                      <Input
                        placeholder="Auto-generated if blank"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Max Uses
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={inviteMaxUses}
                        onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                        className="text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isCreatingInvite}
                      className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                      icon={<PlusCircle className="w-3.5 h-3.5" />}
                    >
                      Generate Code
                    </Button>
                  </form>
                </div>
              )}

              {/* 2. Personalized Candidate Email Invitation Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Mail className="w-4 h-4 text-[#4C70A6]" />
                    <span>Send Candidate Email Invitation (Single-Use Magic Link & Code)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">1 Unique Invite per Student</span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setInviteType("EMAIL");
                    handleCreateInvite(e);
                  }}
                  className="flex flex-col sm:flex-row gap-3 items-end"
                >
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Student Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="student@university.edu"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isCreatingInvite && inviteType === "EMAIL"}
                    className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                    icon={<Mail className="w-3.5 h-3.5" />}
                  >
                    Send Email Invite
                  </Button>
                </form>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Newly Generated Invite Notification Banner */}
              {generatedInvite && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{generatedInvite.email ? `Invitation Emailed to ${generatedInvite.email}` : "Class Invitation Code Ready!"}</span>
                    </div>
                    <div className="font-mono text-emerald-800 mt-1">
                      Code: <strong className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300">{generatedInvite.code}</strong>
                    </div>
                    {generatedInvite.email ? (
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        A personalized invitation link and access code have been sent directly to the student's email inbox.
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Distribute this code to students to redeem on the Catalogue page.
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(generatedInvite.code, "NEW_GEN")}
                    icon={<Copy className="w-3.5 h-3.5 text-emerald-700" />}
                  >
                    {copiedCodeId === "NEW_GEN" ? "Copied!" : "Copy Code"}
                  </Button>
                </div>
              )}

              {/* Issued Invitations List */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[#4C70A6]" />
                  <span>Issued Access Invitations ({invitations.length})</span>
                </h4>

                {invitations.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                    No invitation codes issued yet. Use the form above to generate class codes or send email invitations.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {invitations.map((inv: any) => {
                      const codeStr = inv.code || inv.rawToken || "INV-CODE";
                      const directRedeemLink = `${window.location.origin}/redeem-invitation?code=${codeStr}`;
                      const isRevoked = !!inv.revokedAt;
                      const isExpired = new Date(inv.expiresAt) < new Date();
                      const isFull = inv.usedCount >= inv.maxUses;

                      return (
                        <div
                          key={inv.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-md border border-slate-200 text-xs gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                              {inv.recipientEmail ? <Mail className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {codeStr}
                                </span>
                                {isRevoked ? (
                                  <Badge variant="danger">Revoked</Badge>
                                ) : isExpired ? (
                                  <Badge variant="outline">Expired</Badge>
                                ) : isFull ? (
                                  <Badge variant="warning">Fully Redeemed</Badge>
                                ) : (
                                  <Badge variant="success">Active</Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                {inv.recipientEmail ? (
                                  <span>Bound to: <strong className="text-slate-700">{inv.recipientEmail}</strong></span>
                                ) : (
                                  <span>Redeemed: <strong className="text-slate-700">{inv.usedCount} / {inv.maxUses}</strong></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {!isRevoked && (
                              <button
                                type="button"
                                onClick={() => handleCopyLink(directRedeemLink, inv.id)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[#4C70A6] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedCodeId === inv.id ? "Copied!" : "Copy Link"}</span>
                              </button>
                            )}

                            {!isRevoked && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-600 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
