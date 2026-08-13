import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { Badge } from "@components/ui/Badge";
import { Upload, ArrowLeft, CheckCircle2, AlertTriangle, FileText, Download } from "lucide-react";

export const QuestionImportScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [hasImported, setHasImported] = useState(false);

  const mockParsedQuestions = [
    { row: 1, type: "MCQ", prompt: "What is Paxos consensus quorum?", status: "VALID" },
    { row: 2, type: "TRUE_FALSE", prompt: "Vector clocks guarantee total order.", status: "VALID" },
    { row: 3, type: "MCQ", prompt: "Select fill-in-the-blank option...", status: "INVALID_TYPE", error: "Fill-in-the-blank is excluded from v1." },
  ];

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setHasImported(true);
    }, 800);
  };

  return (
    <AppLayout pageTitle="Import Questions">
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
                <Upload className="w-5 h-5 text-[#4C70A6]" />
                <span>Question Bank Import & Validation</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload bulk question sets (JSON, CSV, or QTI 2.1) with server-side validation.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
              onClick={() => alert("Sample template downloaded!")}
            >
              Download Template
            </Button>
          </div>

          {/* Upload Dropzone */}
          {!hasImported && (
            <div
              onClick={handleSimulateUpload}
              className="border-2 border-dashed border-slate-300 hover:border-[#4C70A6] rounded-md p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#4C70A6]/10 text-[#4C70A6] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isUploading ? "Uploading & Validating File..." : "Click or Drag File to Upload"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .JSON, .CSV, or QTI XML format. Maximum file size 10MB.
                </p>
              </div>
            </div>
          )}

          {/* Validation Results Table */}
          {hasImported && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-md border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Validation Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    2 valid questions ready • 1 invalid row flagged
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/question-bank")}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Import Valid Questions (2)
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockParsedQuestions.map((q) => (
                    <TableRow key={q.row}>
                      <TableCell className="font-mono text-xs font-bold text-slate-600">
                        #{q.row}
                      </TableCell>
                      <TableCell><Badge variant="outline">{q.type}</Badge></TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 max-w-xs truncate">
                        {q.prompt}
                      </TableCell>
                      <TableCell>
                        {q.status === "VALID" ? (
                          <Badge variant="success">Valid</Badge>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 font-mono">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{q.error}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
