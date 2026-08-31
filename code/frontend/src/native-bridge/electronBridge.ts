import type { ElectronBridge } from "./types";

const browserFallbackBridge: ElectronBridge = {
  isElectron: false,
  getSystemFingerprint: async () => "DEV_BROWSER_FINGERPRINT_SHA256_MOCK",
  getAttestationToken: async () => "DEV_BROWSER_ATTESTATION_TOKEN_MOCK",
  enableLockdown: async () => ({
    success: true,
    error: "Running in Browser Mode (Mock Lockdown Active)",
  }),
  disableLockdown: async () => ({ success: true }),
  getDisplayCount: async () => 1,
  onSecurityViolation: () => {
    // No-op cleanup function for standard browser env
    return () => {};
  },
};

export const nativeBridge: ElectronBridge =
  typeof window !== "undefined" && window.electronBridge
    ? window.electronBridge
    : browserFallbackBridge;