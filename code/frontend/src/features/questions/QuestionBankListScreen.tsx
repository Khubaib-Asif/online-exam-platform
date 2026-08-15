import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@components/ui/Table";
import {
  HelpCircle,
  Search,
  Plus,
  Upload,
  Tag,
  History,
  Eye,
  Edit,
  Archive,
  Filter,
} from "lucide-react";

export interface QuestionBankItem {
  id: string;
  version: number;
  type: "MCQ" | "MSQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER";
  prompt: string;
  marks: number;
  tags: string[];
  isArchived: boolean;
  updatedAt: string;
}

const mockQuestions: QuestionBankItem[] = [
  {
    id: "q-101",
    version: 2,
    type: "MCQ",
    prompt: "In Paxos consensus, what is the minimum quorum size required for a cluster of N nodes?",
    marks: 4,
    tags: ["Distributed Systems", "Consensus"],
    isArchived: false,
    updatedAt: "Aug 02, 2026",
  },
  {
    id: "q-102",
    version: 1,
    type: "MSQ",
    prompt: "Select all properties guaranteed by linearizability in distributed storage systems.",
    marks: 5,
    tags: ["Consistency", "Storage"],
    isArchived: false,
    updatedAt: "Jul 28, 2026",
  },
  {
    id: "q-103",
    version: 3,
    type: "TRUE_FALSE",
    prompt: "True or False: Vector clocks establish a total ordering of events in distributed systems.",
    marks: 2,
    tags: ["Clocks", "Ordering"],
    isArchived: false,
    updatedAt: "Jul 20, 2026",
  },
  {
    id: "q-104",
    version: 1,
    type: "SHORT_ANSWER",
    prompt: "Explain the two-phase commit (2PC) protocol failure mode when the coordinator crashes.",
    marks: 8,
    tags: ["Transactions", "2PC"],
    isArchived: false,
    updatedAt: "Jun 15, 2026",
  },
  {
    id: "q-105",
    version: 2,
    type: "LONG_ANSWER",
    prompt: "Design a fault-tolerant distributed key-value store using Raft for leader election and log replication.",
    marks: 15,
    tags: ["System Design", "Raft"],
    isArchived: false,
    updatedAt: "May 30, 2026",
  },
];

export const QuestionBankListScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [questionsList, setQuestionsList] = useState(mockQuestions);

  const filteredQuestions = questionsList.filter((q) => {
    const matchesSearch =
      q.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "ALL" || q.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: QuestionBankItem["type"]) => {
    switch (type) {
      case "MCQ":
        return <Badge variant="info">MCQ</Badge>;
      case "MSQ":
        return <Badge variant="warning">MSQ</Badge>;
      case "TRUE_FALSE":
        return <Badge variant="success">True / False</Badge>;
      case "SHORT_ANSWER":
        return <Badge variant="outline">Short Answer</Badge>;
      case "LONG_ANSWER":
        return <Badge variant="default">Long Answer</Badge>;
    }
  };

  return (
    <AppLayout pageTitle="Question Bank">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#4C70A6]" />
              <span>Question Bank</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Author, version, tag, and manage reusable questions for examination revisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/question-bank/import")}
              icon={<Upload className="w-3.5 h-3.5 text-slate-600" />}
            >
              Import Questions
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/question-bank/tags")}
              icon={<Tag className="w-3.5 h-3.5 text-slate-600" />}
            >
              Manage Tags
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/question-bank/new")}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Question
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search prompt or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 shrink-0">Type:</span>
            {["ALL", "MCQ", "MSQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  typeFilter === t
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t === "ALL" ? "All Types" : t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Question Table */}
        <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Prompt Preview</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    No questions found matching your query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{getTypeBadge(q.type)}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-medium text-slate-900 line-clamp-2 text-xs">
                        {q.prompt}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {q.id}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-800">
                      {q.marks} pts
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {q.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      v{q.version}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/question-bank/${q.id}/preview`)}
                          icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                          title="Preview"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/question-bank/${q.id}/edit`)}
                          icon={<Edit className="w-3.5 h-3.5 text-slate-600" />}
                          title="Edit"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/question-bank/${q.id}/history`)}
                          icon={<History className="w-3.5 h-3.5 text-slate-600" />}
                          title="Version History"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};
