import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { Badge } from "@components/ui/Badge";
import { Tag, Plus, Trash2, ArrowLeft, Archive, Check } from "lucide-react";

export const QuestionOrganisationScreen: React.FC = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState([
    { name: "Distributed Systems", count: 14 },
    { name: "Consensus", count: 8 },
    { name: "Calculus", count: 12 },
    { name: "Quantum Mechanics", count: 5 },
    { name: "Transactions", count: 9 },
  ]);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    setTags([...tags, { name: newTag.trim(), count: 0 }]);
    setNewTag("");
  };

  const handleRemoveTag = (name: string) => {
    setTags(tags.filter((t) => t.name !== name));
  };

  return (
    <AppLayout pageTitle="Question Organisation & Tags">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
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
                <Tag className="w-5 h-5 text-[#4C70A6]" />
                <span>Question Organisation & Tags</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage tags, categories, and archive states across your teacher-owned question bank.
              </p>
            </div>
          </div>

          {/* Add Tag Form */}
          <form onSubmit={handleAddTag} className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Create New Tag"
                placeholder="e.g. Operating Systems"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
            </div>
            <Button variant="primary" size="md" type="submit" icon={<Plus className="w-4 h-4" />}>
              Add Tag
            </Button>
          </form>

          {/* Active Tags Grid */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Active Question Tags ({tags.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tags.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#4C70A6]" />
                    <span>{t.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {t.count} questions
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTag(t.name)}
                    icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
