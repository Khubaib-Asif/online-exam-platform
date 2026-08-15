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

export interface ElectronBridge {
  readonly isElectron: boolean;
  getSystemFingerprint: () => Promise<string>;
  getAttestationToken: () => Promise<string>;
  enableLockdown: () => Promise<LockdownResult>;
  disableLockdown: () => Promise<LockdownResult>;
  getDisplayCount: () => Promise<number>;
  onSecurityViolation: (
    callback: (event: SecurityViolationEvent) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronBridge?: ElectronBridge;
  }
}