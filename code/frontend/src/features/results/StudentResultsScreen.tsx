import React from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { FileCheck, ChevronRight, Award, Calendar } from "lucide-react";

export interface StudentResultItem {
  resultId: string;
  examId: string;
  examTitle: string;
  teacherName: string;
  awardedMarks: number;
  totalMarks: number;
  gradePercentage: string;
  publishedAt: string;
  status: "PASSED" | "FAILED";
}

const mockStudentResults: StudentResultItem[] = [
  {
    resultId: "res-801",
    examId: "ex-401",
    examTitle: "CS 401 — Distributed Systems & Architecture",
    teacherName: "Dr. Sarah Jenkins",
    awardedMarks: 87,
    totalMarks: 100,
    gradePercentage: "87.0%",
    publishedAt: "Aug 04, 2026",
    status: "PASSED",
  },
  {
    resultId: "res-802",
    examId: "ex-202",
    examTitle: "MATH 202 — Advanced Multivariable Calculus",
    teacherName: "Prof. Robert Vance",
    awardedMarks: 92,
    totalMarks: 100,
    gradePercentage: "92.0%",
    publishedAt: "Aug 01, 2026",
    status: "PASSED",
  },
];

export const StudentResultsScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="My Results">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#4C70A6]" />
            <span>My Published Exam Results</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View published grades, scores, feedback, and performance breakdowns.
          </p>
        </div>

        {/* Results Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Examination</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Published Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStudentResults.map((res) => (
                <TableRow key={res.resultId}>
                  <TableCell>
                    <div>
                      <div className="font-semibold text-slate-900">{res.examTitle}</div>
                      <div className="text-xs text-slate-400 font-mono">ID: {res.examId}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">{res.teacherName}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-900">
                    {res.awardedMarks} / {res.totalMarks} pts ({res.gradePercentage})
                  </TableCell>
                  <TableCell>
                    <Badge variant={res.status === "PASSED" ? "success" : "error"}>
                      {res.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {res.publishedAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/results/${res.resultId}`)}
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};
