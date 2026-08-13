import React from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Button } from "@components/ui/Button";
import { ShieldAlert, Smartphone } from "lucide-react";

export const DeviceLimitReachedScreen: React.FC = () => {
  return (
    <AppLayout pageTitle="Device Limit Reached">
      <div className="flex flex-col items-center justify-center py-6">
        <CredentialPanel
          title="Device Limit Reached"
          subtitle="You have already registered the maximum 2 active devices."
        >
          <div className="flex flex-col gap-4 text-center">
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-[3px] text-xs flex items-center gap-3 text-left">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              <span>
                To register this new device, you must first sign in from an existing registered device and revoke a non-current device slot in <strong>My Devices</strong>.
              </span>
            </div>

            <Link to="/devices" className="w-full">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={<Smartphone className="w-4 h-4" />}
              >
                Go to My Devices
              </Button>
            </Link>

            <div className="mt-2 text-xs text-slate-500">
              <Link to="/dashboard" className="text-[#4C70A6] hover:underline font-semibold">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </CredentialPanel>
      </div>
    </AppLayout>
  );
};