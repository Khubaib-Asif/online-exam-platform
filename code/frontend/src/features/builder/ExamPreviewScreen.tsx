import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Eye, ArrowLeft, Clock, ShieldCheck, ChevronRight, Lock } from "lucide-react";

export const ExamPreviewScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const previewExam = {
    id: examId || "ex-401",
    title: "CS 401 — Distributed Systems & Architecture",
    sections: [
      {
        id: "sec-1",
        title: "Section A: Consensus & Core Concepts",
        durationMinutes: 45,
        questions: [
          {
            id: "q-101",
            prompt: "In Paxos consensus, what is the minimum quorum size required for a cluster of N nodes?",
            type: "MCQ",
            options: ["N / 2", "floor(N / 2) + 1", "N - 1", "2 * N + 1"],
          },
          {
            id: "q-102",
            prompt: "Select all properties guaranteed by linearizability in distributed storage systems.",
            type: "MSQ",
            options: ["Real-time ordering", "Eventual consistency", "Sequential consistency", "Atomicity"],
          },
        ],
      },
      {
        id: "sec-2",
        title: "Section B: System Design & Fault Tolerance",
        durationMinutes: 75,
        questions: [
          {
            id: "q-104",
            prompt: "Explain the two-phase commit (2PC) protocol failure mode when the coordinator crashes.",
            type: "SHORT_ANSWER",
          },
        ],
      },
    ],
  };

  const currentSection = previewExam.sections[activeSectionIdx];
  const currentQuestion = currentSection.questions[activeQuestionIdx];

  const handleNextQuestion = () => {
    if (activeQuestionIdx < currentSection.questions.length - 1) {
      setActiveQuestionIdx(activeQuestionIdx + 1);
    } else if (activeSectionIdx < previewExam.sections.length - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      setActiveQuestionIdx(0);
    }
  };

  return (
    <AppLayout pageTitle={`Exam Preview — ${previewExam.id}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(`/builder/${previewExam.id}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Builder</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="info">Paper Projection Preview</Badge>
                <Badge variant="outline" className="font-mono">FORWARD_ONLY</Badge>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{previewExam.title}</h1>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/builder/${previewExam.id}/publish`)}
            >
              Proceed to Publication
            </Button>
          </div>

          {/* Section Tabs Bar */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-md overflow-x-auto">
            {previewExam.sections.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSectionIdx(idx);
                  setActiveQuestionIdx(0);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                  activeSectionIdx === idx
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {sec.title} ({sec.durationMinutes}m)
              </button>
            ))}
          </div>

          {/* Simulated Exam Delivery Screen */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500 font-mono">
              <span>
                {currentSection.title} • Question {activeQuestionIdx + 1} of {currentSection.questions.length}
              </span>
              <div className="flex items-center gap-1 font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-[#4C70A6]" />
                <span>{currentSection.durationMinutes}:00</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{currentQuestion.type}</Badge>
                <span className="text-xs text-slate-400 font-mono">ID: {currentQuestion.id}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 leading-relaxed">
                {currentQuestion.prompt}
              </h3>
            </div>

            {currentQuestion.options && (
              <div className="flex flex-col gap-2">
                {currentQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800"
                  >
                    <input type="radio" disabled className="w-4 h-4 text-[#4C70A6]" />
                    <span className="font-mono font-bold text-slate-400">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}

            {!currentQuestion.options && (
              <textarea
                rows={4}
                disabled
                placeholder="Student subjective text entry area..."
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-md text-slate-400 cursor-not-allowed"
              />
            )}

            <div className="flex justify-end pt-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleNextQuestion}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Submit & Next Question
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
