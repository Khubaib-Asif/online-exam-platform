import type { ElectronBridge } from "./types";

const browserFallbackBridge: ElectronBridge = {
  isElectron: false,
  getSystemFingerprint: async () => "DEV_BROWSER_FINGERPRINT_SHA256_MOCK",
  getAttestationToken: async () => "DEV_BROWSER_ATTESTATION_TOKEN_MOCK",
  getDeviceInfo: async () => ({
    hostname: "Current PC",
    platform: navigator.userAgent.includes("Windows") ? "Windows" : navigator.userAgent.includes("Mac") ? "macOS" : "Desktop",
    label: "Current PC",
  }),
  enableLockdown: async () => ({
    success: true,
    error: "Running in Browser Mode (Mock Lockdown Active)",
  }),
  disableLockdown: async () => ({ success: true }),
  getDisplayCount: async () => 1,
  closeExamShell: async () => {
    window.location.href = "/dashboard";
    return { success: true };
  },
  onSecurityViolation: () => {
    // No-op cleanup function for standard browser env
    return () => {};
  },
};

export const nativeBridge: ElectronBridge =
  typeof window !== "undefined" && window.electronBridge
    ? window.electronBridge
    : browserFallbackBridge;