import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { Award, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";

export const ResultDetailScreen: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();

  const report = {
    resultId: resultId || "res-801",
    examTitle: "CS 401 — Distributed Systems & Architecture",
    teacherName: "Dr. Sarah Jenkins",
    publishedAt: "Aug 04, 2026",
    totalAwarded: 87,
    totalMax: 100,
    percentage: "87.0%",
    status: "PASSED",
    items: [
      { id: "q-101", title: "Paxos Quorum Size", awarded: 4, max: 4, type: "MCQ" },
      { id: "q-102", title: "Linearizability Properties", awarded: 5, max: 5, type: "MSQ" },
      { id: "q-104", title: "2PC Coordinator Crash", awarded: 7, max: 8, type: "SHORT_ANSWER" },
    ],
    teacherFeedback: "Excellent work overall. Strong understanding of distributed consensus and 2PC failure modes.",
  };

  return (
    <AppLayout pageTitle={`Result Detail — ${report.resultId}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/results")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Results</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="success">Immutable Published Result</Badge>
                <span className="font-mono text-xs text-slate-400">ID: {report.resultId}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{report.examTitle}</h1>
              <p className="text-xs text-slate-500 mt-1">Instructor: {report.teacherName} • Published {report.publishedAt}</p>
            </div>
            <Badge variant="success" className="text-base py-1.5 px-4 font-mono font-bold">
              {report.percentage} ({report.status})
            </Badge>
          </div>

          {/* Score Card */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200 text-center font-mono">
            <div>
              <div className="text-xs text-slate-500">Awarded Points</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{report.totalAwarded}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Maximum Points</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{report.totalMax}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Final Outcome</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{report.status}</div>
            </div>
          </div>

          {/* Question Level Breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Question Score Breakdown
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question ID & Concept</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.id}</div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      {item.awarded} / {item.max} pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Instructor Feedback */}
          {report.teacherFeedback && (
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-900 block mb-1">Instructor Feedback:</span>
              <p className="text-slate-700 italic">{report.teacherFeedback}</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
