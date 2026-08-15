import { z } from "zod";

export const GateNameSchema = z.enum([
  "IDENTITY",
  "DEVICE",
  "ENVIRONMENT",
  "LOCKDOWN",
  "CONSENT",
  "ATTESTATION",
]);

export const GateStatusSchema = z.enum([
  "PENDING",
  "PASSED",
  "FAILED",
  "REQUIRES_REVIEW",
]);

export const GateResultSchema = z.object({
  name: GateNameSchema,
  status: GateStatusSchema,
  policyVersion: z.string(),
  evidenceRef: z.string().optional(),
  evaluatedAt: z.string(),
});

export const DeviceRegistrationSchema = z.object({
  deviceName: z.string().min(2, "Device name is required"),
  systemFingerprint: z.string().min(1, "Fingerprint required"),
});

export const DeviceGateCheckSchema = z.object({
  examId: z.string().uuid(),
  deviceFingerprint: z.string().min(1, "Fingerprint required"),
  attestationToken: z.string().min(1, "Attestation token required"),
});

export type GateName = z.infer<typeof GateNameSchema>;
export type GateStatus = z.infer<typeof GateStatusSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type DeviceRegistrationInput = z.infer<typeof DeviceRegistrationSchema>;
export type DeviceGateCheckInput = z.infer<typeof DeviceGateCheckSchema>;