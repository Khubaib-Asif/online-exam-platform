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
  Trash2,
  Edit2,
} from "lucide-react";
import {
  useGetExamDetailsQuery,
  useUpdateExamSettingsMutation,
  useCreateExamInvitationMutation,
  useRevokeExamInvitationMutation,
  useGetExamDistributionStatusQuery,
} from "@/redux/services/examBuilderApi";
import {
  toLocalDatetimeInput,
  calculateClosesAt,
  fromLocalDatetimeInput,
} from "@/utils/dateTime";

export const ExamSettingsAudienceScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const targetId = examId || "";

  const { data: apiDetails, refetch: refetchDetails } = useGetExamDetailsQuery(targetId, { skip: !targetId });
  const { data: distData, refetch: refetchDist } = useGetExamDistributionStatusQuery(targetId, { skip: !targetId });

  const [updateExamSettingsApi, { isLoading: isSaving }] = useUpdateExamSettingsMutation();
  const [createInvitationApi, { isLoading: isCreatingInvite }] = useCreateExamInvitationMutation();
  const [revokeInvitationApi] = useRevokeExamInvitationMutation();

  const isPublished = apiDetails?.status === "PUBLISHED";

  const [timingMode, setTimingMode] = useState<
    "WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED"
  >("WHOLE_PAPER");

  // Timing Hierarchy State
  const [paperDuration, setPaperDuration] = useState<number>(30);

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
  const [copiedCode, setCopiedCode] = useState(false);

  const invitations = distData?.invitations || [];
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
      alert(err.data?.message || err.message || "Failed to regenerate class code.");
    }
  };

  // Sync state with fetched database record
  useEffect(() => {
    if (!apiDetails) return;
    const durMinutes = apiDetails.paperDurationSeconds
      ? Math.round(apiDetails.paperDurationSeconds / 60)
      : 30;

    if (apiDetails.timingMode) setTimingMode(apiDetails.timingMode as any);
    setPaperDuration(durMinutes);
    if (apiDetails.accessPolicy) setRegistrationPolicy(apiDetails.accessPolicy as any);
    if (apiDetails.lateEntryGraceMinutes !== undefined) setGracePeriodMinutes(apiDetails.lateEntryGraceMinutes);

    if (apiDetails.registrationOpensAt) {
      setRegOpensAt(toLocalDatetimeInput(apiDetails.registrationOpensAt));
    }
    if (apiDetails.registrationClosesAt) {
      setRegClosesAt(toLocalDatetimeInput(apiDetails.registrationClosesAt));
    }
    if (apiDetails.startsAt) {
      const startStr = toLocalDatetimeInput(apiDetails.startsAt);
      setStartsAt(startStr);
      setClosesAt(calculateClosesAt(startStr, durMinutes));
    }
  }, [apiDetails]);

  const handleStartsAtChange = (newStartsAt: string) => {
    setStartsAt(newStartsAt);
    if (newStartsAt && paperDuration > 0) {
      setClosesAt(calculateClosesAt(newStartsAt, paperDuration));
    }
  };

  const handlePaperDurationChange = (newDuration: number) => {
    setPaperDuration(newDuration);
    if (startsAt && newDuration > 0) {
      setClosesAt(calculateClosesAt(startsAt, newDuration));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || isPublished) return;
    setErrorMessage(null);

    const validGrace = Math.min(30, Math.max(0, gracePeriodMinutes || 0));

    try {
      await updateExamSettingsApi({
        examId: targetId,
        data: {
          timingMode,
          paperDurationSeconds: paperDuration * 60,
          accessPolicy: registrationPolicy,
          registrationOpensAt: fromLocalDatetimeInput(regOpensAt),
          registrationClosesAt: fromLocalDatetimeInput(regClosesAt),
          startsAt: fromLocalDatetimeInput(startsAt),
          closesAt: fromLocalDatetimeInput(closesAt),
          lateEntryGraceMinutes: validGrace,
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
      const payload: any = {
        examId: targetId,
      };

      if (inviteType === "EMAIL") {
        if (!inviteEmail.trim()) return;
        payload.recipientEmail = inviteEmail.trim();
        payload.maxUses = 1;
      } else {
        payload.maxUses = inviteMaxUses > 0 ? inviteMaxUses : 30;
        if (customCode.trim()) {
          payload.customCode = customCode.trim();
        }
      }

      const res: any = await createInvitationApi(payload).unwrap();

      const code =
        res?.data?.code ||
        res?.data?.rawToken ||
        res?.code ||
        res?.rawToken ||
        "INV-CODE";
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
      console.error("Generate invitation error:", err);
      alert(err.data?.message || err.message || "Failed to create invitation code.");
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation code?")) return;
    try {
      await revokeInvitationApi({ examId: targetId, invitationId }).unwrap();
      refetchDist();
    } catch (err: any) {
      alert(err.data?.message || err.message || "Failed to revoke invitation.");
    }
  };

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
                Exam: <span className="font-semibold text-slate-900">{apiDetails?.title}</span>
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
                  This exam revision is published. Structural parameters and timing settings are locked to maintain integrity for active candidates.
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

          {/* 2. Total Paper Duration */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Total Paper Duration
            </h3>

            <div className="max-w-xs">
              <Input
                label="Whole Paper Duration (Minutes) *"
                type="number"
                min={5}
                max={600}
                disabled={isPublished}
                value={paperDuration}
                onChange={(e) => handlePaperDurationChange(Number(e.target.value))}
                helperText="Total allocated paper execution duration."
              />
            </div>
            {timingMode === "SECTION_TIMED" && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded">
                Note: In Per-Section Timed mode, you must specify the duration for each section when adding or editing sections in the Exam Builder. The sum of all section durations must equal this total paper duration.
              </p>
            )}
            {timingMode === "QUESTION_TIMED" && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded">
                Note: In Per-Question Timed mode, you must specify each section's duration and each question's time limit in the Exam Builder. The sum of question time limits must equal the section duration.
              </p>
            )}
          </div>

          {/* 3. Window A: Early Registration & Teacher Approval Window */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#4C70A6]" />
                <span>3. Window A: Early Registration & Approval Window </span>
              </h3>
              <Badge variant="outline" className="font-mono text-[10px]">
                Pre-Exam Phase
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Students discover the exam and submit registration / approval requests days in advance. 
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
                <span>4. Window B: Fixed Synchronous Exam Execution Window </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Fixed Exam Start Time *"
                type="datetime-local"
                disabled={isPublished}
                value={startsAt}
                onChange={(e) => handleStartsAtChange(e.target.value)}
                helperText="Exact server time paper launches for all candidates."
              />
              <Input
                label="Fixed Exam End Time (Auto-calculated) *"
                type="datetime-local"
                disabled={true}
                value={closesAt}
                helperText={`Automatically locked: Start Time + ${paperDuration} Minutes`}
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <Input
                  label="Late Entry Grace Period (Minutes, 0–30) *"
                  type="number"
                  min={0}
                  max={30}
                  disabled={isPublished}
                  value={gracePeriodMinutes}
                  onChange={(e) => setGracePeriodMinutes(Math.min(30, Math.max(0, Number(e.target.value))))}
                  helperText="Entry window: 0 to 30 min after start. Set 0 for zero tolerance."
                />
                {startsAt && (
                  <div className="mt-1.5 text-[11px] text-[#4C70A6] font-mono bg-blue-50/50 p-1.5 rounded border border-blue-100">
                    Allowed Entry: {new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(new Date(startsAt).getTime() + (gracePeriodMinutes || 0) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-slate-700 justify-center">
                <span className="font-bold">Hard Cutoff Enforced:</span>
                <span>Active paper sessions automatically lock and auto-submit at <strong className="font-mono">Fixed Exam End Time</strong>. Late joiners get the remaining time up to the end time.</span>
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

                <div className="flex items-center gap-3 border-b border-[#4C70A6]/20 pb-2.5">
                  <span className="text-xs font-semibold text-slate-700">Issue Mode:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteType("CLASS_CODE")}
                      className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                        inviteType === "CLASS_CODE"
                          ? "bg-[#4C70A6] text-white font-semibold shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Class / Cohort Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteType("EMAIL")}
                      className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                        inviteType === "EMAIL"
                          ? "bg-[#4C70A6] text-white font-semibold shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Personalized Direct Email
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {inviteType === "EMAIL" ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Candidate Email Address (Single-Use Invitation)
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
                          Send Email Invite
                        </Button>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Sends an automated email containing a single-use redemption link & code to candidate.
                      </span>
                    </div>
                  ) : activeClassInvite ? (
                    /* Active Class Code Box */
                    <div className="bg-white border border-slate-300 rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Active Class Code:</span>
                          <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 tracking-wide">
                            {activeClassInvite.code}
                          </span>
                          <Badge variant="info">Code-Only Access</Badge>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Students enter this code directly on the Catalogue page via <strong>"Redeem Invitation Code"</strong>.
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-medium">
                          <span>
                            Redeemed: <strong className="text-slate-900">{activeClassInvite.usedCount} / {activeClassInvite.maxUses}</strong>
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
                          onClick={() => handleCopyLink(activeClassInvite.code)}
                          icon={<Copy className="w-3.5 h-3.5 text-[#4C70A6]" />}
                        >
                          {copiedCode ? "Copied!" : "Copy Code"}
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
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-600 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Generate Initial Class Code Box */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Custom Code (Optional, e.g. CS401)
                        </label>
                        <Input
                          placeholder="Auto-generated if blank"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          className="font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                          Max Allowed Redemptions
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={500}
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
                      </div>
                    </div>
                  )}
                </div>

                {/* Newly Generated Code Banner */}
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
                          Personalized redemption magic link and access code dispatched to candidate inbox.
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-700 mt-0.5">
                          Share this code with your class for redemption on the Catalogue page.
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyLink(generatedInvite.code)}
                      icon={<Copy className="w-3.5 h-3.5 text-emerald-700" />}
                    >
                      {copiedCode ? "Copied!" : "Copy Code"}
                    </Button>
                  </div>
                )}

                {/* Issued Invitations List */}
                {invitations.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-[#4C70A6]/20 pt-3">
                    <label className="text-xs font-bold text-slate-800">
                      Issued Invitations History ({invitations.length})
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {invitations.map((inv: any) => {
                        const codeStr = inv.code || inv.rawToken || "INV-CODE";
                        const isRevoked = !!inv.revokedAt;
                        const isExpired = new Date(inv.expiresAt) < new Date();
                        const isFull = inv.usedCount >= inv.maxUses;

                        return (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200 text-xs gap-3"
                          >
                            <div className="flex items-center gap-3 font-mono">
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {codeStr}
                              </span>
                              <Badge variant="outline">{inv.recipientEmail || "Class Code"}</Badge>
                              <span className="text-slate-700 font-semibold">Uses: {inv.usedCount} / {inv.maxUses}</span>
                              {isRevoked ? (
                                <Badge variant="danger">Revoked</Badge>
                              ) : isExpired ? (
                                <Badge variant="outline">Expired</Badge>
                              ) : isFull ? (
                                <Badge variant="warning">Full</Badge>
                              ) : (
                                <Badge variant="success">Active</Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {!isRevoked && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(codeStr)}
                                  className="text-[#4C70A6] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Code</span>
                                </button>
                              )}
                              {!isRevoked && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  className="text-red-500 hover:text-red-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer ml-2"
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
