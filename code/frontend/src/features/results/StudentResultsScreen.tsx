import React from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { FileCheck, ChevronRight, Award, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { useGetStudentResultsQuery, type StudentResultItem } from "@redux/services/gradingApi";

export type { StudentResultItem };

export const StudentResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: results = [], isLoading, isError, refetch } = useGetStudentResultsQuery();

  return (
    <AppLayout pageTitle="My Results">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-[#4C70A6]" />
              <span>My Published Exam Results</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              View published grades, scores, feedback, and performance breakdowns.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>

        {/* Results Table */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-3 shadow-2xs">
            <RefreshCw className="w-8 h-8 text-[#4C70A6] animate-spin" />
            <p className="text-xs font-medium text-slate-600">Loading published results...</p>
          </div>
        ) : isError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-md p-6 text-center text-xs text-rose-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Failed to load exam results.</span>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md p-12 text-center flex flex-col items-center gap-2 shadow-2xs">
            <Award className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No Published Results Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              When your instructors complete grading and publish result snapshots, your grades will appear here.
            </p>
          </div>
        ) : (
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
                {results.map((res: StudentResultItem) => (
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
                      {new Date(res.publishedAt).toLocaleDateString()}
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
        )}
      </div>
    </AppLayout>
  );
};

