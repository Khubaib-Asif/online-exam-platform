import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  Settings,
  ArrowLeft,
  Lock,
  Globe,
  UserCheck,
  ShieldCheck,
  Save,
  CheckCircle2,
  Calendar,
  Clock,
  Mail,
  Copy,
  Key,
  PlusCircle,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import {
  useGetExamDetailsQuery,
  useUpdateExamSettingsMutation,
  useCreateExamInvitationMutation,
  useGetExamDistributionStatusQuery,
} from "@/redux/services/examBuilderApi";

export const ExamSettingsAudienceScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails, refetch: refetchDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const { data: distData, refetch: refetchDist } = useGetExamDistributionStatusQuery(targetId, { skip: !targetId });

  const [updateExamSettingsApi, { isLoading: isSaving }] = useUpdateExamSettingsMutation();
  const [createInvitationApi, { isLoading: isCreatingInvite }] = useCreateExamInvitationMutation();

  const isPublished = apiDetails?.status === "PUBLISHED";

  const [timingMode, setTimingMode] = useState<
    "WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED"
  >("WHOLE_PAPER");

  // Timing Hierarchy State
  const [paperDuration, setPaperDuration] = useState<number>(120);
  const [defaultSectionDurationSec, setDefaultSectionDurationSec] = useState<number>(1800);
  const [defaultQuestionTimeLimitSec, setDefaultQuestionTimeLimitSec] = useState<number>(60);

  // Access Policy
  const [registrationPolicy, setRegistrationPolicy] = useState<
    "PUBLIC" | "INVITATION_ONLY" | "APPROVAL_REQUIRED"
  >("APPROVAL_REQUIRED");

  // Windows
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(15);

  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(1);
  const [generatedInvite, setGeneratedInvite] = useState<{
    code: string;
    link: string;
    email?: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync state with fetched database record
  useEffect(() => {
    if (!apiDetails) return;
    const timer = setTimeout(() => {
      if (apiDetails.timingMode) setTimingMode(apiDetails.timingMode as any);
      if (apiDetails.paperDurationSeconds) setPaperDuration(Math.round(apiDetails.paperDurationSeconds / 60));
      if (apiDetails.accessPolicy) setRegistrationPolicy(apiDetails.accessPolicy as any);

      if (apiDetails.registrationOpensAt) {
        setRegOpensAt(new Date(apiDetails.registrationOpensAt).toISOString().slice(0, 16));
      }
      if (apiDetails.registrationClosesAt) {
        setRegClosesAt(new Date(apiDetails.registrationClosesAt).toISOString().slice(0, 16));
      }
      if (apiDetails.startsAt) {
        setStartsAt(new Date(apiDetails.startsAt).toISOString().slice(0, 16));
      }
      if (apiDetails.closesAt) {
        setClosesAt(new Date(apiDetails.closesAt).toISOString().slice(0, 16));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [apiDetails]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || isPublished) return;
    setErrorMessage(null);

    try {
      await updateExamSettingsApi({
        examId: targetId,
        data: {
          timingMode,
          paperDurationSeconds: paperDuration * 60,
          accessPolicy: registrationPolicy,
          registrationOpensAt: regOpensAt ? new Date(regOpensAt).toISOString() : undefined,
          registrationClosesAt: regClosesAt ? new Date(regClosesAt).toISOString() : undefined,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
        },
      }).unwrap();

      setIsSaved(true);
      refetchDetails();
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      console.error("Save settings error:", err);
      const msg = err.data?.message || err.message || "Failed to update settings.";
      setErrorMessage(msg);
    }
  };

  const handleGenerateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    try {
      const res: any = await createInvitationApi({
        examId: targetId,
        recipientEmail: inviteEmail.trim() || undefined,
        maxUses: inviteEmail.trim() ? 1 : inviteMaxUses,
      }).unwrap();

      const code =
        res?.data?.rawToken ||
        res?.rawToken ||
        res?.data?.token ||
        res?.token ||
        "INV-CODE";
      const link = `${window.location.origin}/redeem-invitation?code=${code}`;

      setGeneratedInvite({
        code,
        link,
        email: inviteEmail.trim() || undefined,
      });

      setInviteEmail("");
      refetchDist();
    } catch (err) {
      console.error("Generate invitation error:", err);
      alert("Failed to create invitation code.");
    }
  };

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const invitations = distData?.invitations || [];

  return (
    <AppLayout pageTitle={`Exam Settings — ${apiDetails?.title || targetId}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/builder/${targetId}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Builder</span>
          </button>
        </div>

        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#4C70A6]" />
                <span>Exam Settings & Schedule Policy</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Exam: <span className="font-semibold text-slate-900">{apiDetails?.title}</span> • ID:{" "}
                <span className="font-mono text-slate-400">{targetId}</span>
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isPublished}
              isLoading={isSaving}
              icon={<Save className="w-4 h-4" />}
            >
              {isPublished ? "Revision Published (Locked)" : "Save Settings"}
            </Button>
          </div>

          {isPublished && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Exam Revision Published & Frozen:</span>
                <p className="mt-0.5 text-slate-600 leading-relaxed">
                  This exam revision is published in PostgreSQL. Structural parameters and timing settings are locked to maintain integrity for active candidates.
                </p>
              </div>
            </div>
          )}

          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Exam timing modes, early registration windows, and access policies saved!</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Timing Mode Selection */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Timing Mode Selection
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { mode: "WHOLE_PAPER" as const, label: "Whole Paper", desc: "Single global timer for full paper" },
                { mode: "SECTION_TIMED" as const, label: "Per-Section", desc: "Independent timers per section" },
                { mode: "QUESTION_TIMED" as const, label: "Per-Question", desc: "Strict timer per question" },
                { mode: "MIXED" as const, label: "Mixed Mode", desc: "Custom section & question timers" },
              ].map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  disabled={isPublished}
                  onClick={() => setTimingMode(item.mode)}
                  className={`p-3 rounded-md border text-xs font-semibold text-left transition-colors flex flex-col gap-1 ${
                    timingMode === item.mode
                      ? "border-[#4C70A6] bg-[#4C70A6]/5 text-[#4C70A6] ring-1 ring-[#4C70A6]"
                      : "border-slate-200 text-slate-700"
                  } ${isPublished ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-slate-300"}`}
                >
                  <div className="font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal leading-tight">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Multi-Level Timing Hierarchy */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Multi-Level Timing Hierarchy (Paper, Section, Question)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Whole Paper Duration (Minutes) *"
                type="number"
                min={5}
                max={600}
                disabled={isPublished}
                value={paperDuration}
                onChange={(e) => setPaperDuration(Number(e.target.value))}
                helperText="Total allocated paper execution duration."
              />

              <Input
                label="Section Duration Default (Seconds)"
                type="number"
                min={30}
                disabled={isPublished}
                placeholder="e.g. 1800 for 30 mins"
                value={defaultSectionDurationSec}
                onChange={(e) => setDefaultSectionDurationSec(Number(e.target.value))}
                helperText="Default duration for sections."
              />

              <Input
                label="Question Time Limit Default (Seconds)"
                type="number"
                min={10}
                disabled={isPublished}
                placeholder="e.g. 30, 45, or 60s"
                value={defaultQuestionTimeLimitSec}
                onChange={(e) => setDefaultQuestionTimeLimitSec(Number(e.target.value))}
                helperText="Default limit for single question."
              />
            </div>
          </div>

          {/* 3. Window A: Early Registration & Teacher Approval Window */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#4C70A6]" />
                <span>3. Window A: Early Registration & Approval Window (Days/Weeks Early)</span>
              </h3>
              <Badge variant="outline" className="font-mono text-[10px]">
                Pre-Exam Phase
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Students discover the exam and submit registration / approval requests days in advance. Teachers approve or reject requests prior to test day.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Registration Opens At"
                type="datetime-local"
                disabled={isPublished}
                value={regOpensAt}
                onChange={(e) => setRegOpensAt(e.target.value)}
                helperText="When students can start submitting registration requests."
              />
              <Input
                label="Registration Closes At"
                type="datetime-local"
                disabled={isPublished}
                value={regClosesAt}
                onChange={(e) => setRegClosesAt(e.target.value)}
                helperText="Deadline for submitting registration requests."
              />
            </div>
          </div>

          {/* 4. Window B: Fixed Synchronous Exam Execution Window */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4C70A6]" />
                <span>4. Window B: Fixed Synchronous Exam Execution Window (Exact Start & End)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Fixed Exam Start Time *"
                type="datetime-local"
                disabled={isPublished}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                helperText="Exact server time paper launches for all candidates."
              />
              <Input
                label="Fixed Exam End Time (Hard Cutoff) *"
                type="datetime-local"
                disabled={isPublished}
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                helperText="Server clock hard cutoff when active sessions terminate."
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="Late Entry Grace Period (Minutes)"
                type="number"
                min={0}
                max={60}
                disabled={isPublished}
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                helperText="Blocks paper launch past this grace period to prevent question leakage."
              />
              <div className="flex flex-col gap-1 text-[11px] text-slate-700 justify-center">
                <span className="font-bold">Hard Cutoff Enforced:</span>
                <span>Active paper sessions automatically lock and auto-submit at <strong className="font-mono">Fixed Exam End Time</strong>.</span>
              </div>
            </div>
          </div>

          {/* 5. Access Policy Selector */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              5. Registration & Access Policy
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  policy: "PUBLIC" as const,
                  label: "Public Access",
                  desc: "Any authenticated student may register without approval.",
                  icon: Globe,
                },
                {
                  policy: "APPROVAL_REQUIRED" as const,
                  label: "Approval Required",
                  desc: "Students submit request days early; teacher approves or rejects.",
                  icon: UserCheck,
                },
                {
                  policy: "INVITATION_ONLY" as const,
                  label: "Invitation Only",
                  desc: "Single-use invitation code or direct email link required.",
                  icon: Lock,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = registrationPolicy === item.policy;
                return (
                  <button
                    key={item.policy}
                    type="button"
                    disabled={isPublished}
                    onClick={() => setRegistrationPolicy(item.policy)}
                    className={`p-4 rounded-md border text-left flex flex-col gap-2 transition-colors ${
                      isSelected
                        ? "border-[#4C70A6] bg-[#4C70A6]/5 ring-1 ring-[#4C70A6]"
                        : "border-slate-200"
                    } ${isPublished ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-slate-300"}`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Icon className="w-4 h-4 text-[#4C70A6]" />
                      <span>{item.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* 6. Dedicated Invitation Code & Email Distribution Panel */}
            {registrationPolicy === "INVITATION_ONLY" && (
              <div className="mt-3 p-4 bg-[#4C70A6]/5 border border-[#4C70A6]/30 rounded-md flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#4C70A6]/20 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Key className="w-4 h-4 text-[#4C70A6]" />
                    <span>Issue Invitation Codes & Email Access Links</span>
                  </div>
                  <Badge variant="info">Invitation Engine Active</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Direct Email Invitation (Single-Use Link & Code)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="student@university.edu"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isCreatingInvite}
                        onClick={handleGenerateInvitation}
                        icon={<Mail className="w-3.5 h-3.5" />}
                      >
                        Send Email
                      </Button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Sends an automated email containing single-use redemption link & code to candidate.
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 border-l border-slate-200 pl-4">
                    <label className="text-xs font-semibold text-slate-700">
                      Shared Class Invitation Code (Multi-Use Limit)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        placeholder="Max Uses (e.g. 30)"
                        value={inviteMaxUses}
                        onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={isCreatingInvite}
                        onClick={handleGenerateInvitation}
                        icon={<PlusCircle className="w-3.5 h-3.5 text-[#4C70A6]" />}
                      >
                        Generate Code
                      </Button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Generates a reusable invitation code for class broadcast or printed distribution.
                    </span>
                  </div>
                </div>

                {/* Newly Generated Code Banner */}
                {generatedInvite && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Invitation Created & Emailed!</span>
                      </div>
                      <div className="font-mono text-emerald-800 mt-1">
                        Code: <strong className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300">{generatedInvite.code}</strong>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono mt-0.5 truncate max-w-md">
                        Link: {generatedInvite.link}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyLink(generatedInvite.link)}
                      icon={<Copy className="w-3.5 h-3.5 text-emerald-700" />}
                    >
                      {copiedCode ? "Copied!" : "Copy Link"}
                    </Button>
                  </div>
                )}

                {/* Issued Invitations List */}
                {invitations.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-[#4C70A6]/20 pt-3">
                    <label className="text-xs font-bold text-slate-800">
                      Issued Invitations History ({invitations.length})
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                      {invitations.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-3 font-mono">
                            <Badge variant="outline">{inv.recipientEmail || "Class Code"}</Badge>
                            <span className="font-bold text-slate-800">Uses: {inv.usedCount} / {inv.maxUses}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(`${window.location.origin}/redeem-invitation?code=${inv.id}`)}
                            className="text-[#4C70A6] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Copy Access Link</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Settings immediately update PostgreSQL database and active exam revision.
            </span>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isPublished}
              isLoading={isSaving}
            >
              {isPublished ? "Published (Locked)" : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
