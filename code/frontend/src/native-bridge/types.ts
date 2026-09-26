export type ViolationType =
  | "FOCUS_LOST"
  | "FORBIDDEN_KEYSTROKE"
  | "MULTIPLE_DISPLAYS"
  | "DEVTOOLS_OPEN_ATTEMPT"
  | "UNAUTHORIZED_PROCESS";

export interface SecurityViolationEvent {
  type: ViolationType;
  timestampMs: number;
  details?: string;
}

export interface LockdownResult {
  success: boolean;
  error?: string;
}

export interface DeviceInfo {
  hostname: string;
  platform: string;
  release?: string;
  arch?: string;
  cpu?: string;
  label: string;
}

export interface ElectronBridge {
  readonly isElectron: boolean;
  getSystemFingerprint: () => Promise<string>;
  getAttestationToken: () => Promise<string>;
  getDeviceInfo?: () => Promise<DeviceInfo>;
  enableLockdown: () => Promise<LockdownResult>;
  disableLockdown: () => Promise<LockdownResult>;
  getDisplayCount: () => Promise<number>;
  closeExamShell?: () => Promise<{ success: boolean }>;
  onSecurityViolation: (
    callback: (event: SecurityViolationEvent) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronBridge?: ElectronBridge;
  }
}