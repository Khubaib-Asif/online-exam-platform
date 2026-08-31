import { z } from "zod";

export const SystemRoleSchema = z.enum([
  "OWNER",
  "TEACHER",
  "STUDENT",
  "PROCTOR",
]);

export const BootstrapOwnerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password requires an uppercase letter")
    .regex(/[0-9]/, "Password requires a number")
    .regex(/[^a-zA-Z0-9]/, "Password requires a special character"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const RegisterStudentSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profilePhotoHash: z.string().min(1, "Profile photo attestation is required"),
});

export const CreateTeacherInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
});

export const RedeemTeacherInviteSchema = z.object({
  invitationCode: z.string().min(8, "Invalid invitation code"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const RedeemPasswordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type SystemRole = z.infer<typeof SystemRoleSchema>;
export type BootstrapOwnerInput = z.infer<typeof BootstrapOwnerSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterStudentInput = z.infer<typeof RegisterStudentSchema>;
export type CreateTeacherInviteInput = z.infer<typeof CreateTeacherInviteSchema>;
export type RedeemTeacherInviteInput = z.infer<typeof RedeemTeacherInviteSchema>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type RedeemPasswordResetInput = z.infer<typeof RedeemPasswordResetSchema>;