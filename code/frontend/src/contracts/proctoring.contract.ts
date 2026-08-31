import { z } from "zod";

export const EvidenceKindSchema = z.enum([
  "CAMERA",
  "MICROPHONE",
  "SCREEN",
  "ENVIRONMENT",
  "CLIENT_EVENT",
]);

export const SignalSeveritySchema = z.enum(["INFO", "LOW", "MEDIUM", "HIGH"]);

export const EvidenceEnvelopeSchema = z.object({
  attemptId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  capturedAt: z.string(),
  kind: EvidenceKindSchema,
  payloadRef: z.string(),
  contentHash: z.string(),
  clientVersion: z.string(),
});

export const IntegritySignalSchema = z.object({
  attemptId: z.string().uuid(),
  signalType: z.string(),
  severity: SignalSeveritySchema,
  algorithmVersion: z.string(),
  observedAt: z.string(),
  evidenceRefs: z.array(z.string()),
});

export const ProctorIncidentReviewSchema = z.object({
  incidentId: z.string().uuid(),
  decision: z.enum(["CLEARED", "FLAGGED", "TERMINATED"]),
  notes: z.string().min(3, "Review notes are required"),
});

export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type SignalSeverity = z.infer<typeof SignalSeveritySchema>;
export type EvidenceEnvelope = z.infer<typeof EvidenceEnvelopeSchema>;
export type IntegritySignal = z.infer<typeof IntegritySignalSchema>;
export type ProctorIncidentReviewInput = z.infer<typeof ProctorIncidentReviewSchema>;