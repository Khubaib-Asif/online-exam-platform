import React from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { CheckCircle2, Home, FileCheck } from "lucide-react";

export const AttemptCompleteScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="Attempt Complete">
      <div className="max-w-md mx-auto flex flex-col gap-6 text-center">
        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-[#4C70A6] flex items-center justify-center">
            <FileCheck className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">Thank You!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your examination attempt is complete. Results will be visible on your dashboard once published by your instructor.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => navigate("/dashboard")}
              icon={<Home className="w-4 h-4" />}
            >
              Return to Student Dashboard
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => navigate("/results")}
            >
              View My Published Results
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
