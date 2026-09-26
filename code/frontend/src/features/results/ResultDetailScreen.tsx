import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { Award, ArrowLeft, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle, Lock } from "lucide-react";
import { useGetStudentResultDetailQuery } from "@redux/services/gradingApi";

export const ResultDetailScreen: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();

  const {
    data: report,
    isLoading,
    isError,
  } = useGetStudentResultDetailQuery(resultId || "", {
    skip: !resultId,
  });

  if (isLoading) {
    return (
      <AppLayout pageTitle="Result Detail">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-3 shadow-2xs">
          <RefreshCw className="w-8 h-8 text-[#4C70A6] animate-spin" />
          <p className="text-xs font-medium text-slate-600">Loading published result report...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !report) {
    return (
      <AppLayout pageTitle="Result Detail">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <button
            onClick={() => navigate("/results")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Results</span>
          </button>
          <div className="bg-rose-50 border border-rose-200 rounded-md p-6 text-center text-xs text-rose-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Published result report not found or access restricted.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

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
                <span className="font-mono text-xs text-slate-400">ID: {report.resultId.slice(0, 12)}...</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{report.examTitle}</h1>
              <p className="text-xs text-slate-500 mt-1">
                Instructor: {report.teacherName} • Published {new Date(report.publishedAt).toLocaleDateString()}
              </p>
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
              <div className={`text-2xl font-bold mt-1 ${report.status === "PASSED" ? "text-emerald-600" : "text-rose-600"}`}>
                {report.status}
              </div>
            </div>
          </div>

          {/* Cryptographic Snapshot Verification Hash */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cryptographic Integrity Hash:</span>
            </div>
            <span className="text-slate-800 font-bold truncate max-w-xs">{report.resultHash}</span>
          </div>

          {/* Question Level Breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Question Score Breakdown
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question Concept</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Q{idx + 1}</div>
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

