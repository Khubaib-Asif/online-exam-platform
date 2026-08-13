import { z } from "zod";

export const RegistrationStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "REVOKED",
]);

export const RedeemExamCodeSchema = z.object({
  invitationCode: z
    .string()
    .min(6, "Invitation code must be at least 6 characters"),
});

export const CreateRegistrationRequestSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
  deviceFingerprint: z.string().min(1, "Device fingerprint is required"),
});

export const DecideRegistrationSchema = z.object({
  registrationId: z.string().uuid("Invalid registration ID"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export type RegistrationStatus = z.infer<typeof RegistrationStatusSchema>;
export type RedeemExamCodeInput = z.infer<typeof RedeemExamCodeSchema>;
export type CreateRegistrationRequestInput = z.infer<
  typeof CreateRegistrationRequestSchema
>;
export type DecideRegistrationInput = z.infer<typeof DecideRegistrationSchema>;