import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { RefreshCw, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export const ReconnectDecisionScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const handleAction = (granted: boolean) => {
    alert(granted ? "Manual reconnect window granted." : "Reconnect request denied.");
    navigate("/monitoring");
  };

  return (
    <AppLayout pageTitle="Reconnect Decision">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/monitoring")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live Monitor</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col gap-5 text-center items-center">
          <RefreshCw className="w-10 h-10 text-amber-500" />
          <div>
            <Badge variant="warning" className="mb-2">PAUSED_RECONNECT</Badge>
            <h1 className="text-lg font-bold text-slate-900">Teacher Reconnect Approval</h1>
            <p className="text-xs text-slate-500 mt-1">
              Student <strong>Sophia Patel</strong> requested manual reconnect extension.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-left text-xs font-mono text-slate-700 flex flex-col gap-1">
            <div>Disconnected At: 10:05:40 AM</div>
            <div>Reason: Network Interface Offline</div>
          </div>

          <div className="w-full flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleAction(true)}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Grant Reconnect
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleAction(false)}
              icon={<XCircle className="w-4 h-4" />}
            >
              Deny & Terminate
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
