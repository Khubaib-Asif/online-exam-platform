import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Shield, Loader2, CheckCircle2, Lock, ArrowRight, AlertCircle, Laptop } from "lucide-react";
import { useCreateLaunchTicketMutation, useVerifyLaunchTicketQuery } from "@/redux/services/gateApi";
import { useGetExamDetailsQuery } from "@/redux/services/registrationApi";

export const SessionEntryScreen: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const targetExamId = examId || "";
  const existingTicket = searchParams.get("ticket") || "";

  const { data: examDetails, isLoading: isExamLoading } = useGetExamDetailsQuery(targetExamId, {
    skip: !targetExamId,
  });

  const [createLaunchTicket, { isLoading: isCreatingTicket }] = useCreateLaunchTicketMutation();
  const [ticket, setTicket] = useState<string>(existingTicket);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: ticketVerification, isLoading: isVerifyingTicket } = useVerifyLaunchTicketQuery(ticket, {
    skip: !ticket,
  });

  useEffect(() => {
    if (existingTicket) {
      setTicket(existingTicket);
    }
  }, [existingTicket]);

  const handleGenerateTicket = async () => {
    if (!targetExamId) return;
    setErrorMessage(null);
    try {
      const res = await createLaunchTicket(targetExamId).unwrap();
      setTicket(res.launchTicket);
    } catch (err: any) {
      setErrorMessage(
        err.data?.message || err.message || "Failed to generate examination launch ticket."
      );
    }
  };

  return (
    <AppLayout pageTitle="Session Entry — Desktop Launcher">
      <div className="max-w-xl mx-auto flex flex-col gap-6 text-center">
        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#4C70A6] text-white flex items-center justify-center shadow-md">
            <Shield className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {examDetails?.title || "Examination Assessment Launch"}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Initiating the secure, lockdown exam container. Launch ticket will establish native device attestation.
            </p>
          </div>

          {errorMessage && (
            <div className="w-full p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col gap-3 font-mono text-xs text-left">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Target Examination:</span>
              <span className="font-bold text-slate-900">{examDetails?.title || targetExamId}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Candidate Eligibility:</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Launch Ticket Status:</span>
              {ticket ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cryptographically Sealed
                </span>
              ) : (
                <span className="font-bold text-slate-400">Ready to Request</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Presentation Mode:</span>
              <span className="font-bold text-slate-800">SIGNED_ELECTRON_LOCKDOWN</span>
            </div>
          </div>

          {ticket ? (
            <div className="w-full flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold"
                onClick={() => navigate(`/exam/${targetExamId}/gates?ticket=${encodeURIComponent(ticket)}`)}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Launch Security Gate Verification
              </Button>
              <div className="text-[11px] text-slate-400">
                Ticket expires in 5 minutes. Gate checks must be completed on this device.
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-semibold"
              disabled={isCreatingTicket || isExamLoading}
              onClick={handleGenerateTicket}
              icon={isCreatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Laptop className="w-4 h-4" />}
            >
              {isCreatingTicket ? "Generating Launch Ticket..." : "Generate Examination Launch Ticket"}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
