import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert } from "lucide-react";

export const GateFailureScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="Gate Failure">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <Badge variant="error" className="mb-2">GATE_ERR_LOCKDOWN_MONITOR</Badge>
            <h1 className="text-xl font-bold text-slate-900">Security Gate Check Failed</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your device environment did not satisfy the security gate requirements for this exam.
            </p>
          </div>

          <div className="w-full bg-red-50/70 border border-red-200 rounded-md p-4 text-left text-xs text-red-900 flex flex-col gap-2">
            <div className="font-bold flex items-center gap-1.5 text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Failed Check: LOCKDOWN Gate</span>
            </div>
            <p className="text-red-700 leading-relaxed">
              Multiple displays were detected. Please disconnect secondary monitors and close secondary virtual displays before retrying.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate(`/exam/${examId || "ex-401"}/gates`)}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Re-evaluate Security Gates
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => navigate("/devices")}
            >
              Manage Registered Devices
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
