import React from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { AlertTriangle, ArrowLeft, Trash2, ShieldCheck } from "lucide-react";

export const RevokeDeviceConfirmationScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleConfirmRevoke = () => {
    alert("Device revoked successfully.");
    navigate("/devices");
  };

  return (
    <AppLayout pageTitle="Revoke Device Confirmation">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate("/devices")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Devices</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs flex flex-col items-center text-center gap-5">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900">Revoke Device Binding</h1>
            <p className="text-xs text-slate-500 mt-1">
              Confirm non-current device revocation to free up a slot in your 2-device cap.
            </p>
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 text-left text-xs text-slate-700 font-mono">
            <div className="font-bold text-slate-900">Device: Windows Lab PC #4</div>
            <div className="text-slate-400 mt-1">Registered: Jul 10, 2026</div>
          </div>

          <div className="w-full flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => navigate("/devices")}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmRevoke}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Revoke
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
