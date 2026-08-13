import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  Settings,
  ArrowLeft,
  Clock,
  Lock,
  Globe,
  UserCheck,
  ShieldCheck,
  Save,
  CheckCircle2,
} from "lucide-react";

export const ExamSettingsAudienceScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [timingMode, setTimingMode] = useState<
    "WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED"
  >("SECTION_TIMED");
  const [paperDuration, setPaperDuration] = useState<number>(120);

  const [registrationPolicy, setRegistrationPolicy] = useState<
    "PUBLIC" | "INVITATION_ONLY" | "APPROVAL_REQUIRED"
  >("APPROVAL_REQUIRED");

  const [shufflePolicy, setShufflePolicy] = useState<"NONE" | "WITHIN_SECTION">(
    "WITHIN_SECTION"
  );
  const [startDate, setStartDate] = useState("2026-08-10T09:00");
  const [endDate, setEndDate] = useState("2026-08-10T11:00");

  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <AppLayout pageTitle={`Exam Settings — ${examId || "ex-401"}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/builder/${examId || "ex-401"}`)}
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
                <span>Exam Settings & Access Policy</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Exam ID: <span className="font-mono font-bold text-slate-800">{examId || "ex-401"}</span>
              </p>
            </div>

            <Button variant="primary" size="sm" type="submit" icon={<Save className="w-4 h-4" />}>
              Save Settings
            </Button>
          </div>

          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Exam timing and registration settings updated successfully!</span>
            </div>
          )}

          {/* Timing Configuration */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Timing Mode & Durations
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["WHOLE_PAPER", "SECTION_TIMED", "QUESTION_TIMED", "MIXED"] as const).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTimingMode(mode)}
                    className={`p-3 rounded-md border text-xs font-semibold text-left transition-colors cursor-pointer ${
                      timingMode === mode
                        ? "border-[#4C70A6] bg-[#4C70A6]/5 text-[#4C70A6]"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="font-mono font-bold">{mode.replace("_", " ")}</div>
                  </button>
                )
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <Input
                label="Whole Paper Duration (Minutes)"
                type="number"
                value={paperDuration}
                onChange={(e) => setPaperDuration(Number(e.target.value))}
                helperText="Must equal sum of section durations when all sections are timed."
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">
                  Navigation Policy Invariant
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-800 font-bold">
                  FORWARD_ONLY (Fixed by platform policy)
                </div>
              </div>
            </div>
          </div>

          {/* Registration Policy Selector */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Registration & Access Policy
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
                  desc: "Students submit request; teacher approves or rejects.",
                  icon: UserCheck,
                },
                {
                  policy: "INVITATION_ONLY" as const,
                  label: "Invitation Only",
                  desc: "Single-use invitation code required to register.",
                  icon: Lock,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = registrationPolicy === item.policy;
                return (
                  <button
                    key={item.policy}
                    type="button"
                    onClick={() => setRegistrationPolicy(item.policy)}
                    className={`p-4 rounded-md border text-left flex flex-col gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "border-[#4C70A6] bg-[#4C70A6]/5 ring-1 ring-[#4C70A6]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
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
          </div>

          {/* Schedule Windows */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Exam Schedule Window
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Exam Start Time"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Exam End Time"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              For v1, the teacher is the sole approval authority. No academic hierarchy exists.
            </span>
            <Button variant="primary" size="md" type="submit">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
