import React, { useState } from "react";
import { AppLayout } from "@components/layout/AppLayout";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Modal } from "@components/ui/Modal";
import {
  Smartphone,
  Monitor,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Plus,
  ExternalLink,
  Download,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@redux/hooks";
import {
  useGetDevicesQuery,
  useRevokeDeviceMutation,
  type DeviceItem,
} from "@/redux/services/deviceApi";
import { nativeBridge } from "@/native-bridge/electronBridge";

export const MyDevicesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken, user } = useAppSelector((state) => state.auth);
  const { data: deviceResponse, isLoading, refetch } = useGetDevicesQuery();
  const [revokeDevice, { isLoading: isRevoking }] = useRevokeDeviceMutation();

  const devices: DeviceItem[] = deviceResponse?.devices || deviceResponse?.activeDevices || [];
  const activeCount = deviceResponse?.activeCount ?? devices.length;

  const [selectedDeviceToRevoke, setSelectedDeviceToRevoke] = useState<DeviceItem | null>(null);
  const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);

  const handleRevokeConfirm = async () => {
    if (!selectedDeviceToRevoke) return;
    try {
      await revokeDevice(selectedDeviceToRevoke.id).unwrap();
      setSelectedDeviceToRevoke(null);
      refetch();
    } catch (err: any) {
      console.error("Revoke error:", err);
    }
  };

  const handleRegisterNewDevice = () => {
    if (nativeBridge.isElectron) {
      navigate("/devices/register-action");
    } else {
      setShowDesktopPrompt(true);
    }
  };

  const handleOpenDesktopAppForRegistration = () => {
    const token = accessToken || localStorage.getItem("accessToken") || "";
    const userPayload = user || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!) : null);
    const deepLinkUrl = `examapp://register?${token ? `auth=${encodeURIComponent(token)}` : ""}${userPayload ? `&user=${encodeURIComponent(JSON.stringify(userPayload))}` : ""}`;
    window.location.href = deepLinkUrl;
  };

  const handleDownloadApp = () => {
    const blob = new Blob(
      ["Online Exam Platform — Secure Desktop Lockdown Shell"],
      { type: "application/octet-stream" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "OnlineExamLauncher-Setup.exe";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout pageTitle="My Devices">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs text-left flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#4C70A6]" />
                <span>My Registered Examination Devices</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Hardware devices bound to your account for secure exam attestation (Max 2 active devices).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={activeCount >= 2 ? "warning" : "success"} className="font-mono text-xs py-1 px-3">
                {activeCount} / 2 Devices Registered
              </Badge>
              {activeCount < 2 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRegisterNewDevice}
                  className="bg-[#4C70A6] hover:bg-[#3F5E8E] text-white"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Register New Device
                </Button>
              )}
            </div>
          </div>

          {/* Device List */}
          <div className="flex flex-col gap-3">
            {devices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-md border border-slate-200/80">
                No active registered devices. Click "Register New Device" to launch the desktop registration.
              </div>
            ) : (
              devices.map((device, idx) => {
                const isCurrent = nativeBridge.isElectron && idx === 0;

                return (
                  <div
                    key={device.id}
                    className="p-4 bg-slate-50 border border-slate-200/90 rounded-md flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-2xs">
                        <Monitor className="w-5 h-5 text-[#4C70A6]" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {device.name}
                          </span>
                          {isCurrent ? (
                            <Badge variant="success" className="text-[10px]">
                              Current Desktop App
                            </Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px]">
                              Authorized for Exams
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono mt-0.5">
                          {device.os || "Desktop"}
                          {device.registeredAt ? ` • Registered: ${new Date(device.registeredAt).toLocaleDateString()}` : ""}
                          {device.lastSeen ? ` • Last attestation: ${new Date(device.lastSeen).toLocaleDateString()}` : ""}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                      onClick={() => setSelectedDeviceToRevoke(device)}
                      title="Revoke device hardware authorization"
                    >
                      Revoke Access
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#4C70A6] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">Desktop App Registration Protocol</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Device registration extracts native hardware fingerprints via the signed Electron desktop shell rather than browser DOM fingerprints to prevent spoofing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop App Registration Modal for Browser Users */}
      <Modal
        isOpen={showDesktopPrompt}
        onClose={() => setShowDesktopPrompt(false)}
        title="Desktop Lockdown App Required"
        subtitle="Hardware fingerprint registration requires the desktop launcher."
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-md flex items-start gap-2.5">
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Authentic Hardware Signature</span>
              <p className="leading-relaxed">
                To guarantee exam integrity, devices must be registered through the signed Electron Desktop Launcher to capture host OS fingerprints.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-1">
            <Button
              variant="primary"
              size="md"
              className="w-full bg-[#4C70A6] hover:bg-[#3F5E8E] text-white font-medium"
              onClick={handleOpenDesktopAppForRegistration}
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Open in Desktop Launcher App
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
              onClick={handleDownloadApp}
              icon={<Download className="w-4 h-4 text-slate-600" />}
            >
              Download Signed Desktop App (.exe)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={!!selectedDeviceToRevoke}
        onClose={() => setSelectedDeviceToRevoke(null)}
        title="Confirm Device Revocation"
        subtitle={`Revoke hardware binding for "${selectedDeviceToRevoke?.name || selectedDeviceToRevoke?.os}"`}
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="p-3 bg-amber-50 border border-amber-200/80 text-amber-900 text-xs rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Revoking this device will unbind its hardware signature and free up a slot for registering a new device.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedDeviceToRevoke(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleRevokeConfirm}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Confirm Revoke
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};