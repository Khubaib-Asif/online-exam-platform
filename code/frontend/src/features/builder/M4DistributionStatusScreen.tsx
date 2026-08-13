import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Share2, ArrowLeft, Users, Clock, Globe, ShieldCheck } from "lucide-react";

export const M4DistributionStatusScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle={`Exam Distribution — ${examId || "ex-401"}`}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/exams")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Exam List</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="success">Published Revision v3</Badge>
                <span className="font-mono text-xs text-slate-400">ID: {examId || "ex-401"}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Exam Distribution Status</h1>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/registration-requests")}
              icon={<Users className="w-3.5 h-3.5 text-[#4C70A6]" />}
            >
              Manage Registration Requests
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">Catalogue State</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5">Discoverable</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Access Policy</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">APPROVAL_REQUIRED</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Active Registrations</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">28 Approved</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              M4 manages published revision projections; M2 manages active user registrations.
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/builder/${examId || "ex-401"}`)}
            >
              Edit New Revision
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
