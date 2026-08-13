import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@components/layout/AppLayout";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { Laptop, CheckCircle2 } from "lucide-react";

export const RegisterDeviceScreen: React.FC = () => {
  const navigate = useNavigate();
  const [deviceName, setDeviceName] = useState("Home Laptop");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 600);
  };

  return (
    <AppLayout pageTitle="Register Device">
      <div className="flex flex-col items-center justify-center py-6">
        <CredentialPanel
          title="Register Device"
          subtitle="Bind this hardware device to your examination identity."
        >
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              label="Device Friendly Name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Personal MacBook Pro"
              icon={<Laptop className="w-4 h-4" />}
              required
            />

            <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 rounded-[3px] text-left">
              <span className="font-semibold block mb-0.5 text-slate-800">
                Persistent Device Limit (2 Cap):
              </span>
              This device will be registered as 1 of your 2 permitted active devices.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Device Registration
            </Button>
          </form>
        </CredentialPanel>
      </div>
    </AppLayout>
  );
};