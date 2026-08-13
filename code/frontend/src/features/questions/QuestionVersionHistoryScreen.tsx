import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { History, ArrowLeft, ShieldCheck, Lock, Eye } from "lucide-react";

export const QuestionVersionHistoryScreen: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();

  const versions = [
    {
      version: 3,
      createdAt: "Aug 02, 2026 • 11:30 AM",
      author: "Dr. Sarah Jenkins",
      referencedExams: ["CS 401 — Midterm (Published)"],
      isCurrent: true,
      changes: "Updated prompt option B to use floor notation.",
    },
    {
      version: 2,
      createdAt: "Jul 15, 2026 • 02:10 PM",
      author: "Dr. Sarah Jenkins",
      referencedExams: ["CS 401 — Practice Quiz 1"],
      isCurrent: false,
      changes: "Increased awarded marks from 3 to 4 points.",
    },
    {
      version: 1,
      createdAt: "Jun 01, 2026 • 09:00 AM",
      author: "Dr. Sarah Jenkins",
      referencedExams: [],
      isCurrent: false,
      changes: "Initial question draft creation.",
    },
  ];

  return (
    <AppLayout pageTitle={`Version History — ${questionId || "q-101"}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/question-bank")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Question Bank</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-[#4C70A6]" />
                <span>Immutable Version History</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Question ID: <span className="font-mono font-bold text-slate-800">{questionId || "q-101"}</span>
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Changes / Notes</TableHead>
                <TableHead>Published References</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.version}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900">v{v.version}</span>
                      {v.isCurrent && <Badge variant="success">Current</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {v.createdAt}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 max-w-xs">
                    {v.changes}
                  </TableCell>
                  <TableCell>
                    {v.referencedExams.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {v.referencedExams.map((ref) => (
                          <Badge key={ref} variant="info" className="text-[10px] flex items-center gap-1 w-fit">
                            <Lock className="w-2.5 h-2.5" /> {ref}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/question-bank/${questionId || "q-101"}/preview`)}
                      icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Question versions referenced by published exam revisions are permanently locked against in-place edits.
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
