import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useGetQuestionBanksQuery,
  useGetQuestionDetailsQuery,
} from "@/redux/services/questionBankApi";

const DEFAULT_MCQ_OPTIONS = [
  { id: "opt-1", text: "", isCorrect: true },
  { id: "opt-2", text: "", isCorrect: false },
  { id: "opt-3", text: "", isCorrect: false },
  { id: "opt-4", text: "", isCorrect: false },
];

const DEFAULT_TF_OPTIONS = [
  { id: "tf-true", text: "True", isCorrect: true },
  { id: "tf-false", text: "False", isCorrect: false },
];

export const QuestionEditorScreen: React.FC = () => {
  const { questionId } = useParams<{ questionId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(questionId);

  const { data: banksData } = useGetQuestionBanksQuery();
  const defaultBankId = banksData?.[0]?.id || "qb-default";

  const { data: questionDetails, isLoading: isDetailsLoading } = useGetQuestionDetailsQuery(
    questionId || "",
    { skip: !isEditing || !questionId }
  );

  const [createQuestion, { isLoading: isCreating }] = useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] = useUpdateQuestionMutation();

  const [type, setType] = useState<"MCQ" | "MSQ" | "TRUE_FALSE" | "SHORT" | "LONG">("MCQ");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState<number>(1);
  const [tags, setTags] = useState<string>("");
  const [options, setOptions] = useState(DEFAULT_MCQ_OPTIONS);
  const [keywords, setKeywords] = useState("");
  const [rubricReference, setRubricReference] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Populate data when editing
  useEffect(() => {
    if (isEditing && questionDetails && questionDetails.versions?.length > 0) {
      const latest = questionDetails.versions[0];
      setType(latest.type || "MCQ");
      setPrompt(latest.content || "");
      setMarks(latest.marks || 1);
      setTags(Array.isArray(latest.tags) ? latest.tags.join(", ") : "");
      setKeywords(Array.isArray(latest.keywords) ? latest.keywords.join(", ") : "");
      setRubricReference(latest.rubric || "");

      if (latest.type === "TRUE_FALSE") {
        const correctChoice = latest.answerKey === "False" ? "False" : "True";
        setOptions([
          { id: "tf-true", text: "True", isCorrect: correctChoice === "True" },
          { id: "tf-false", text: "False", isCorrect: correctChoice === "False" },
        ]);
      } else if (latest.type === "MCQ" || latest.type === "MSQ") {
        if (latest.options && latest.options.length > 0) {
          const rawAnswerKey = latest.answerKey;
          const correctKeys: string[] = Array.isArray(rawAnswerKey)
            ? rawAnswerKey
            : rawAnswerKey
            ? [rawAnswerKey]
            : [];

          setOptions(
            latest.options.map((optText, index) => ({
              id: `opt-${index + 1}`,
              text: optText,
              isCorrect: correctKeys.includes(optText),
            }))
          );
        } else {
          setOptions(DEFAULT_MCQ_OPTIONS);
        }
      }
    }
  }, [isEditing, questionDetails]);

  const handleTypeChange = (newType: "MCQ" | "MSQ" | "TRUE_FALSE" | "SHORT" | "LONG") => {
    if (newType === type) return;
    setFormError(null);
    setType(newType);

    if (newType === "TRUE_FALSE") {
      setOptions(DEFAULT_TF_OPTIONS);
    } else if (newType === "MCQ" || newType === "MSQ") {
      // If coming from TRUE_FALSE, reset to standard 4 empty options
      const isFromTF = options.length === 2 && options[0].text === "True" && options[1].text === "False";
      if (isFromTF || options.length < 2) {
        setOptions(DEFAULT_MCQ_OPTIONS);
      } else if (newType === "MCQ") {
        // If switching from MSQ to MCQ, ensure only 1 option is marked correct
        const hasCorrect = options.some((o) => o.isCorrect);
        if (!hasCorrect) {
          setOptions(options.map((o, idx) => ({ ...o, isCorrect: idx === 0 })));
        } else {
          let foundFirst = false;
          setOptions(
            options.map((o) => {
              if (o.isCorrect && !foundFirst) {
                foundFirst = true;
                return { ...o, isCorrect: true };
              }
              return { ...o, isCorrect: false };
            })
          );
        }
      }
    }
  };

  const handleAddOption = () => {
    const newId = `opt-${Date.now()}-${options.length + 1}`;
    setOptions([...options, { id: newId, text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    const remaining = options.filter((o) => o.id !== id);
    if (type === "MCQ" && !remaining.some((o) => o.isCorrect) && remaining.length > 0) {
      remaining[0].isCorrect = true;
    }
    setOptions(remaining);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setFormError("Question prompt text is required.");
      return;
    }

    if (!marks || marks <= 0) {
      setFormError("Marks must be a positive number greater than 0.");
      return;
    }

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: any = {
      type,
      content: trimmedPrompt,
      marks: Number(marks),
      tags: tagList,
    };

    if (type === "MCQ") {
      if (options.length < 2) {
        setFormError("MCQ questions require at least 2 options.");
        return;
      }
      const emptyOptIndex = options.findIndex((o) => !o.text.trim());
      if (emptyOptIndex !== -1) {
        setFormError(`Option ${String.fromCharCode(65 + emptyOptIndex)} text cannot be blank.`);
        return;
      }
      const correctOpt = options.find((o) => o.isCorrect);
      if (!correctOpt) {
        setFormError("Please select 1 correct answer option.");
        return;
      }
      payload.options = options.map((o) => o.text.trim());
      payload.answerKey = correctOpt.text.trim();
    } else if (type === "MSQ") {
      if (options.length < 2) {
        setFormError("MSQ questions require at least 2 options.");
        return;
      }
      const emptyOptIndex = options.findIndex((o) => !o.text.trim());
      if (emptyOptIndex !== -1) {
        setFormError(`Option ${String.fromCharCode(65 + emptyOptIndex)} text cannot be blank.`);
        return;
      }
      const correctOpts = options.filter((o) => o.isCorrect);
      if (correctOpts.length === 0) {
        setFormError("Please select at least 1 correct answer option for MSQ.");
        return;
      }
      payload.options = options.map((o) => o.text.trim());
      payload.answerKey = correctOpts.map((o) => o.text.trim());
    } else if (type === "TRUE_FALSE") {
      const selected = options.find((o) => o.isCorrect)?.text;
      payload.options = ["True", "False"];
      payload.answerKey = selected === "False" ? "False" : "True";
    } else if (type === "SHORT") {
      payload.keywords = keywordList;
      payload.rubric = rubricReference.trim() || null;
    } else if (type === "LONG") {
      payload.rubric = rubricReference.trim() || null;
    }

    try {
      if (isEditing && questionId) {
        await updateQuestion({ questionId, question: payload }).unwrap();
      } else {
        await createQuestion({ bankId: defaultBankId, question: payload }).unwrap();
      }
      setIsSaved(true);
      setTimeout(() => navigate("/question-bank"), 900);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to save question.";
      setFormError(msg);
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <AppLayout pageTitle={isEditing ? `Edit Question — ${questionId}` : "Create Question"}>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={() => navigate("/question-bank")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Question Bank</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info">{isEditing ? "Editing Mode" : "New Question"}</Badge>
                {questionId && <span className="font-mono text-xs text-slate-400">ID: {questionId}</span>}
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                {isEditing ? `Edit Question v2 (${questionId})` : "Create New Question"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
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

          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Immutable question version created and saved successfully!</span>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
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
                  "SHORT",
                  "LONG",
                ] as const
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    type === t
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t === "SHORT" ? "Short Answer" : t === "LONG" ? "Long Answer" : t.replace("_", " ")}
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

          {/* TRUE_FALSE Dedicated UI */}
          {type === "TRUE_FALSE" && (
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Select Correct Answer Key
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {["True", "False"].map((choice) => {
                  const isSelected = options.find((o) => o.isCorrect)?.text === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() =>
                        setOptions([
                          { id: "tf-true", text: "True", isCorrect: choice === "True" },
                          { id: "tf-false", text: "False", isCorrect: choice === "False" },
                        ])
                      }
                      className={`p-4 rounded-md border text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{choice}</span>
                      {isSelected ? (
                        <Badge variant="success">Correct Answer</Badge>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">Click to select</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Objective Options Section (MCQ, MSQ) */}
          {(type === "MCQ" || type === "MSQ") && (
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Options & Private Answer Key
                </h3>
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

                    {options.length > 2 && (
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

          {/* Subjective Rubric Section (SHORT, LONG) */}
          {(type === "SHORT" || type === "LONG") && (
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
