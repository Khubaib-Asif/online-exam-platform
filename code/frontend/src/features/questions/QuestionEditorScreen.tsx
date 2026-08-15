import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  HelpCircle,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export const QuestionEditorScreen: React.FC = () => {
  const { questionId } = useParams<{ questionId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(questionId);

  const [type, setType] = useState<
    "MCQ" | "MSQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER"
  >("MCQ");
  const [prompt, setPrompt] = useState(
    isEditing
      ? "In Paxos consensus, what is the minimum quorum size required for a cluster of N nodes?"
      : ""
  );
  const [marks, setMarks] = useState<number>(4);
  const [tags, setTags] = useState<string>("Distributed Systems, Consensus");
  const [options, setOptions] = useState([
    { id: "opt-1", text: "N / 2", isCorrect: false },
    { id: "opt-2", text: "floor(N / 2) + 1", isCorrect: true },
    { id: "opt-3", text: "N - 1", isCorrect: false },
    { id: "opt-4", text: "2 * N + 1", isCorrect: false },
  ]);

  // Subjective rubric fields
  const [keywords, setKeywords] = useState("majority, quorum, consensus, phase 1b");
  const [rubricReference, setRubricReference] = useState(
    "Paxos requires a majority quorum (floor(N/2)+1) to guarantee overlapping quorums across phase 1 and phase 2."
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddOption = () => {
    const newId = `opt-${options.length + 1}`;
    setOptions([...options, { id: newId, text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const handleToggleCorrect = (id: string) => {
    if (type === "MCQ" || type === "TRUE_FALSE") {
      setOptions(options.map((o) => ({ ...o, isCorrect: o.id === id })));
    } else {
      setOptions(
        options.map((o) => (o.id === id ? { ...o, isCorrect: !o.isCorrect } : o))
      );
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  return (
    <AppLayout pageTitle={isEditing ? `Edit Question — ${questionId}` : "Create Question"}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/question-bank")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Question Bank</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#4C70A6]" />
                <span>{isEditing ? `Edit Question v2 (${questionId})` : "Create New Question"}</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure type, wording, answer keys, marks, and rubric metadata.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => navigate(`/question-bank/${questionId || "q-101"}/preview`)}
                icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
              >
                Preview Student View
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSaving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Version
              </Button>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Immutable question version created and saved successfully!</span>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Question Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "MCQ",
                  "MSQ",
                  "TRUE_FALSE",
                  "SHORT_ANSWER",
                  "LONG_ANSWER",
                ] as const
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    type === t
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Rich Text / Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Prompt / Wording <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the full question text or problem description..."
              className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none font-sans"
            />
          </div>

          {/* Marks & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Awarded Marks"
              type="number"
              min={1}
              max={100}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              helperText="Points awarded for a fully correct answer."
            />
            <Input
              label="Tags (Comma Separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Distributed Systems, Consensus"
              helperText="Used for filtering and question bank organization."
            />
          </div>

          {/* Objective Options Section (MCQ, MSQ, TRUE_FALSE) */}
          {(type === "MCQ" || type === "MSQ" || type === "TRUE_FALSE") && (
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Options & Private Answer Key
                </h3>
                {type !== "TRUE_FALSE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={handleAddOption}
                    icon={<Plus className="w-3.5 h-3.5 text-[#4C70A6]" />}
                    className="text-xs text-[#4C70A6]"
                  >
                    Add Option
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {options.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200/80"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCorrect(opt.id)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-white cursor-pointer transition-colors ${
                        opt.isCorrect
                          ? "bg-emerald-600"
                          : "bg-slate-200 hover:bg-slate-300"
                      }`}
                      title="Toggle correct answer key"
                    >
                      {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <span className="font-mono text-xs font-bold text-slate-500 w-4">
                      {String.fromCharCode(65 + idx)}.
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                      className="flex-1 text-xs bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4C70A6]"
                    />

                    {options.length > 2 && type !== "TRUE_FALSE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subjective Rubric Section (SHORT_ANSWER, LONG_ANSWER) */}
          {(type === "SHORT_ANSWER" || type === "LONG_ANSWER") && (
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Subjective Rubric & AI Grading Guidance
              </h3>

              <Input
                label="Required Keywords (Comma Separated)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. majority, quorum, consensus"
                helperText="Keywords used by AI grading suggestion worker."
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Answer / Model Solution
                </label>
                <textarea
                  rows={3}
                  value={rubricReference}
                  onChange={(e) => setRubricReference(e.target.value)}
                  placeholder="Provide reference answer text for teacher grading review..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Answer keys and subjective rubrics are strictly private and never exposed to students.
            </span>
            <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
              Save Question Version
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
