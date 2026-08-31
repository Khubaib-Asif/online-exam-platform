import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import {
  Shield,
  Clock,
  ChevronRight,
  Wifi,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export type ExamTimingMode = "WHOLE_PAPER" | "SECTION_TIMED" | "QUESTION_TIMED" | "MIXED";

export const LiveExamSessionScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  // Configured timing mode for the exam (WHOLE_PAPER, SECTION_TIMED, QUESTION_TIMED)
  const [timingMode, setTimingMode] = useState<ExamTimingMode>("SECTION_TIMED");

  // Timers in seconds
  const [paperSeconds, setPaperSeconds] = useState(7140); // 1h 59m
  const [sectionSeconds, setSectionSeconds] = useState(659); // 10m 59s
  const [questionSeconds, setQuestionSeconds] = useState(30); // 30s per question

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions = [
    {
      id: "q-101",
      sequence: 1,
      section: "Section A: Consensus & Replication",
      prompt: "In Paxos consensus, what is the minimum quorum size required for a cluster of N nodes?",
      type: "MCQ" as const,
      options: [
        { id: "opt-1", text: "N / 2" },
        { id: "opt-2", text: "floor(N / 2) + 1" },
        { id: "opt-3", text: "N - 1" },
        { id: "opt-4", text: "2 * N + 1" },
      ],
    },
    {
      id: "q-102",
      sequence: 2,
      section: "Section A: Consensus & Replication",
      prompt: "Select all properties guaranteed by linearizability in distributed storage systems.",
      type: "MSQ" as const,
      options: [
        { id: "opt-a", text: "Real-time ordering" },
        { id: "opt-b", text: "Eventual consistency" },
        { id: "opt-c", text: "Sequential consistency" },
        { id: "opt-d", text: "Atomicity" },
      ],
    },
    {
      id: "q-104",
      sequence: 3,
      section: "Section B: System Design & Fault Tolerance",
      prompt: "Explain the two-phase commit (2PC) protocol failure mode when the coordinator crashes.",
      type: "SHORT_ANSWER" as const,
    },
  ];

  const currentQ = questions[currentQuestionIdx];

  // Master Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setPaperSeconds((p) => (p > 0 ? p - 1 : 0));
      setSectionSeconds((s) => (s > 0 ? s - 1 : 0));
      setQuestionSeconds((q) => {
        if (q > 1) return q - 1;
        // If QUESTION_TIMED and question timer reaches 0 -> Auto advance next question
        if (timingMode === "QUESTION_TIMED") {
          handleNextQuestion();
          return 30; // Reset 30s for next question
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timingMode, currentQuestionIdx]);

  const formatTimerDisplay = () => {
    if (timingMode === "QUESTION_TIMED") {
      return `${questionSeconds}s`;
    }
    if (timingMode === "SECTION_TIMED") {
      const m = Math.floor(sectionSeconds / 60);
      const s = sectionSeconds % 60;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    // WHOLE_PAPER
    const h = Math.floor(paperSeconds / 3600);
    const m = Math.floor((paperSeconds % 3600) / 60);
    const s = paperSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (qid: string, val: string) => {
    setAnswers({ ...answers, [qid]: val });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setQuestionSeconds(30); // reset per-question timer
    } else {
      navigate(`/exam/${examId || "ex-401"}/submitted`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      {/* Enterprise Dark Header Bar */}
      <header className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shadow-md z-40 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#4C70A6] flex items-center justify-center text-white shadow-2xs">
            <Shield className="w-5 h-5" />
          </div>

          <div>
            <div className="font-bold text-sm text-white tracking-tight leading-none">
              CS 401 — Distributed Systems
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Secure Assessment Shell • {timingMode.replace("_", " ")}
            </div>
          </div>
        </div>

        {/* Header Right: Connection & Respective Timer */}
        <div className="flex items-center gap-6">
          {/* Timing Mode Quick Switcher for Testing */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700 text-[10px] font-mono">
            {(["WHOLE_PAPER", "SECTION_TIMED", "QUESTION_TIMED"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTimingMode(m)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  timingMode === m ? "bg-[#4C70A6] text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {m === "WHOLE_PAPER" ? "Paper" : m === "SECTION_TIMED" ? "Section" : "Question"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <Wifi className="w-3.5 h-3.5" />
            <span>Connected</span>
          </div>

          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-md flex items-center gap-2 text-sm font-mono font-bold text-[#38BDF8] shadow-inner">
            <Clock className="w-4 h-4" />
            <span>{formatTimerDisplay()}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto flex flex-col gap-6 animate-fadeIn">
        {/* Progress & Section Bar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex items-center justify-between text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4C70A6]" />
            <span>{currentQ?.section}</span>
          </div>
          <div className="font-mono text-slate-500 font-semibold">
            Question {currentQuestionIdx + 1} of {questions.length}
          </div>
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="info">{currentQ.type}</Badge>
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-relaxed">
                  {currentQ.prompt}
                </h2>
              </div>
            </div>

            {/* MCQ / MSQ Options */}
            {currentQ.options && (
              <div className="flex flex-col gap-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`w-full p-4 rounded-md border text-left flex items-center gap-3 transition-colors cursor-pointer text-xs ${
                        isSelected
                          ? "border-[#4C70A6] bg-[#4C70A6]/5 font-semibold text-slate-900 ring-1 ring-[#4C70A6]"
                          : "border-slate-200 hover:border-slate-300 text-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#4C70A6] focus:ring-[#4C70A6]"
                      />
                      <span className="font-mono font-bold text-slate-400">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Subjective Text Area */}
            {!currentQ.options && (
              <textarea
                rows={6}
                value={answers[currentQ.id] || ""}
                onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                placeholder="Type your response here..."
                className="w-full text-xs p-3.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#4C70A6]/30 focus:border-[#4C70A6] outline-none font-sans"
              />
            )}

            {/* Clean Action Navigation */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {answers[currentQ.id] ? "Answer recorded" : "Select an answer to proceed"}
              </span>

              <Button
                variant="primary"
                size="md"
                className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold"
                onClick={handleNextQuestion}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                {currentQuestionIdx < questions.length - 1 ? "Next Question" : "Submit Examination"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
