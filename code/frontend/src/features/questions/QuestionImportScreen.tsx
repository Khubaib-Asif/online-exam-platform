import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import { Badge } from "@components/ui/Badge";
import { Upload, ArrowLeft, CheckCircle2, AlertTriangle, FileText, Download } from "lucide-react";
import { useImportQuestionsMutation, useGetQuestionBanksQuery } from "@/redux/services/questionBankApi";

interface ParsedRow {
  row: number;
  type: string;
  prompt: string;
  marks: number;
  status: "VALID" | "INVALID";
  error?: string;
  rawItem: any;
}

export const QuestionImportScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: banksData } = useGetQuestionBanksQuery();
  const defaultBankId = banksData?.[0]?.id || "qb-default";

  const [importQuestions, { isLoading: isUploading }] = useImportQuestionsMutation();
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // 1. Download Real JSON Template File
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        type: "MCQ",
        content: "In Paxos consensus, what is the minimum quorum size required for a cluster of N nodes?",
        options: ["N / 2", "floor(N / 2) + 1", "N - 1", "2 * N + 1"],
        answerKey: "floor(N / 2) + 1",
        marks: 4,
        tags: ["Distributed Systems", "Consensus"],
      },
      {
        type: "TRUE_FALSE",
        content: "Vector clocks establish a total ordering of events in distributed systems.",
        options: ["True", "False"],
        answerKey: "False",
        marks: 2,
        tags: ["Clocks", "Ordering"],
      },
      {
        type: "SHORT",
        content: "Explain the two-phase commit (2PC) protocol failure mode when the coordinator crashes.",
        keywords: ["coordinator", "rollback", "commit", "timeout"],
        rubric: "Full marks for identifying coordinator crash as a blocking point in 2PC.",
        marks: 8,
        tags: ["Transactions", "2PC"],
      },
      {
        type: "LONG",
        content: "Design a fault-tolerant key-value store using Raft for leader election.",
        rubric: "Evaluate based on log replication, leader lease, and quorum safety.",
        marks: 15,
        tags: ["System Design", "Raft"],
      },
    ];

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(templateData, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", "question_import_template.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 2. Parse & Validate Uploaded JSON File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          alert("Invalid file format: JSON root must be an array of question objects.");
          return;
        }

        const rows: ParsedRow[] = parsed.map((item: any, idx: number) => {
          const rowNum = idx + 1;
          const rawType = (item.type || "").toUpperCase();
          const mappedType =
            rawType === "SHORT_ANSWER" ? "SHORT" : rawType === "LONG_ANSWER" ? "LONG" : rawType;

          if (!["MCQ", "MSQ", "TRUE_FALSE", "SHORT", "LONG"].includes(mappedType)) {
            return {
              row: rowNum,
              type: rawType || "UNKNOWN",
              prompt: item.content || item.prompt || "No prompt text provided",
              marks: Number(item.marks) || 0,
              status: "INVALID",
              error: `Invalid question type "${rawType}". Expected MCQ, MSQ, TRUE_FALSE, SHORT, or LONG.`,
              rawItem: item,
            };
          }

          if (!item.content && !item.prompt) {
            return {
              row: rowNum,
              type: mappedType,
              prompt: "Missing prompt text",
              marks: Number(item.marks) || 0,
              status: "INVALID",
              error: "Question text/prompt is required.",
              rawItem: item,
            };
          }

          const marksNum = Number(item.marks) || 1;

          return {
            row: rowNum,
            type: mappedType,
            prompt: item.content || item.prompt,
            marks: marksNum,
            status: "VALID",
            rawItem: {
              ...item,
              type: mappedType,
              content: item.content || item.prompt,
              marks: marksNum,
            },
          };
        });

        setParsedRows(rows);
      } catch (err) {
        alert("Failed to parse JSON file. Please ensure it contains valid JSON syntax.");
      }
    };

    reader.readAsText(file);
  };

  // 3. Submit Valid Rows to Database
  const handleConfirmImport = async () => {
    const validItems = parsedRows.filter((r) => r.status === "VALID").map((r) => r.rawItem);
    if (validItems.length === 0) return;

    try {
      await importQuestions({ bankId: defaultBankId, questions: validItems }).unwrap();
      setImportSuccess(true);
      setTimeout(() => navigate("/question-bank"), 1200);
    } catch (err) {
      console.error("Bulk import error:", err);
      alert("Failed to import questions. Please check server logs.");
    }
  };

  const validCount = parsedRows.filter((r) => r.status === "VALID").length;
  const invalidCount = parsedRows.filter((r) => r.status === "INVALID").length;

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
                <span>Bulk Question Import</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload bulk question files (JSON format) with line-by-line validation against DB schema.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
              onClick={handleDownloadTemplate}
            >
              Download Sample JSON
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {importSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Successfully imported {validCount} questions into your Question Bank! Redirecting...</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {parsedRows.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#4C70A6] rounded-md p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#4C70A6]/10 text-[#4C70A6] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {fileName ? `Selected: ${fileName}` : "Click to Browse or Select JSON File"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload `.JSON` question array file (up to 10MB).
                </p>
              </div>
            </div>
          )}

          {/* Validation Results Table */}
          {parsedRows.length > 0 && !importSuccess && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-md border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Validation Summary ({fileName})</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {validCount} valid questions ready • {invalidCount} invalid rows flagged
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName(null);
                    }}
                  >
                    Select Different File
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={validCount === 0}
                    isLoading={isUploading}
                    onClick={handleConfirmImport}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Import Valid Questions ({validCount})
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Validation Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((q) => (
                    <TableRow key={q.row}>
                      <TableCell className="font-mono text-xs font-bold text-slate-600">
                        #{q.row}
                      </TableCell>
                      <TableCell><Badge variant="outline">{q.type}</Badge></TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 max-w-xs truncate">
                        {q.prompt}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {q.marks} pts
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
