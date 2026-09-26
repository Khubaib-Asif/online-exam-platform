import React, { useState, useEffect } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Button } from "@components/ui/Button";
import { Badge } from "@components/ui/Badge";
import {
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Monitor,
  AlertTriangle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useRegisterDeviceMutation } from "@/redux/services/deviceApi";
import { nativeBridge } from "@/native-bridge/electronBridge";

export const DeviceRegistrationScreen: React.FC = () => {
  const [registerDeviceMutation, { isLoading: isMutating }] = useRegisterDeviceMutation();

  const [status, setStatus] = useState<"COLLECTING" | "REGISTERING" | "SUCCESS" | "FAILED">("COLLECTING");
  const [statusMessage, setStatusMessage] = useState("Accessing native hardware crypto engine...");
  const [registeredHostname, setRegisteredHostname] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number>(3);

  const executeNativeRegistration = async () => {
    setStatus("COLLECTING");
    setErrorMessage(null);
    setStatusMessage("Extracting native hardware fingerprint & OS attestation keys...");

    try {
      // 1. Extract native hardware fingerprint from Electron main process
      const fingerprintHash = await nativeBridge.getSystemFingerprint();

      setStatus("REGISTERING");
      setStatusMessage("Binding hardware signature to account under 2-device policy limit...");

      // 2. Extract host computer name / model from native OS
      let deviceLabel = "Desktop PC";
      let devicePlatform = "Windows";

      if (nativeBridge.getDeviceInfo) {
        try {
          const info = await nativeBridge.getDeviceInfo();
          if (info?.hostname) {
            deviceLabel = info.hostname; // Real computer name, e.g. "LAPTOP-3MUM752P"
          }
          if (info?.platform) {
            devicePlatform = info.platform;
          }
        } catch (infoErr) {
          console.warn("Failed to get native device info:", infoErr);
        }
      } else {
        const platformName = navigator.userAgent.includes("Windows")
          ? "Windows"
          : navigator.userAgent.includes("Mac")
          ? "macOS"
          : navigator.userAgent.includes("Linux")
          ? "Linux"
          : navigator.platform || "Desktop";
        deviceLabel = `${platformName} Device`;
        devicePlatform = platformName;
      }

      setRegisteredHostname(deviceLabel);

      // 3. Submit hardware fingerprint and real computer name to backend API
      await registerDeviceMutation({
        label: deviceLabel,
        platform: devicePlatform,
        appVersion: "1.0.0",
        fingerprintHash,
      }).unwrap();

      setStatus("SUCCESS");
      setStatusMessage("Hardware binding established successfully!");
    } catch (err: any) {
      console.error("Device registration error:", err);
      setStatus("FAILED");
      setErrorMessage(
        err.data?.message || err.message || "Failed to complete hardware device registration."
      );
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      executeNativeRegistration();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Auto-close countdown on success
  useEffect(() => {
    if (status === "SUCCESS") {
      const interval = setInterval(() => {
        setAutoCloseCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (nativeBridge.closeExamShell) {
              nativeBridge.closeExamShell();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const handleExitApp = () => {
    if (nativeBridge.closeExamShell) {
      nativeBridge.closeExamShell();
    } else {
      window.close();
    }
  };

  return (
    <AppLayout pageTitle="Register Device — Desktop Enclave">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-end">
          <button
            onClick={handleExitApp}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Launcher</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-8 shadow-2xs flex flex-col gap-6 text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#4C70A6] text-white flex items-center justify-center shadow-lg ring-4 ring-[#4C70A6]/20">
            <Monitor className="w-7 h-7" />
          </div>

          <div>
            <Badge variant="info" className="mb-2">Electron Native Hardware Binding</Badge>
            <h1 className="text-xl font-bold text-slate-900">Device Hardware Registration</h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Extracting cryptographic hardware signatures directly from the host operating system.
            </p>
          </div>

          {(status === "COLLECTING" || status === "REGISTERING") && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#4C70A6] animate-spin" />
              <div className="text-sm font-bold text-slate-900">
                Registering hardware, please wait...
              </div>
              <div className="text-xs text-slate-500 font-mono bg-white px-3 py-1.5 rounded border border-slate-200 w-full text-center truncate">
                {statusMessage}
              </div>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-md p-6 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <div>
                <div className="text-base font-bold text-emerald-900">Device Successfully Registered!</div>
                <p className="text-xs text-emerald-700 mt-1">
                  Bound hardware signature for <span className="font-bold">{registeredHostname || "this computer"}</span>.
                </p>
                <p className="text-[11px] text-emerald-600 mt-1 font-mono">
                  Returning to web dashboard in {autoCloseCountdown}s...
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white w-full mt-1 font-semibold"
                onClick={handleExitApp}
                icon={<LogOut className="w-4 h-4" />}
              >
                Exit Launcher & Return to Web
              </Button>
            </div>
          )}

          {status === "FAILED" && (
            <div className="w-full bg-red-50 border border-red-200 rounded-md p-6 flex flex-col items-center gap-3">
              <AlertTriangle className="w-9 h-9 text-red-600" />
              <div>
                <div className="text-base font-bold text-red-900">Registration Failed</div>
                <p className="text-xs text-red-700 mt-1">
                  {errorMessage || "Unable to register hardware device."}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2 w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleExitApp}
                >
                  Exit App
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                  onClick={executeNativeRegistration}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4C70A6]" />
            <span>Hardware fingerprinting runs via Electron main process APIs, protecting against spoofing.</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
