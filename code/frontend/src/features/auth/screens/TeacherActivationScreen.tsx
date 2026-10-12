import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { User, Lock, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import {
    useValidateTeacherInvitationQuery,
    useRedeemTeacherInvitationMutation,
} from "@/redux/services/bootstrapApi";

export const TeacherActivationScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const {
        data: validation,
        isLoading: isValidating,
        error: validationApiError,
    } = useValidateTeacherInvitationQuery(token, {
        skip: !token,
    });

    const [redeemInvitation, { isLoading: isRedeeming }] = useRedeemTeacherInvitationMutation();
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (submitError) setSubmitError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setSubmitError("Missing invitation token in URL.");
            return;
        }
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.password) {
            setSubmitError("Please fill in all required fields.");
            return;
        }
        if (formData.password.length < 8) {
            setSubmitError("Password must be at least 8 characters long.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setSubmitError("Passwords do not match.");
            return;
        }

        setSubmitError(null);
        try {
            await redeemInvitation({
                token,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                password: formData.password,
            }).unwrap();

            navigate("/login", {
                state: {
                    successMessage: "Teacher account activated successfully! You can now log in.",
                },
            });
        } catch (err: any) {
            setSubmitError(err.data?.message || err.message || "Activation failed. Please check your token and try again.");
        }
    };

    // 1. Missing Token State
    if (!token) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <CredentialPanel
                    title="Invalid Invitation Link"
                    subtitle="No invitation token was found in the URL."
                >
                    <div className="flex flex-col gap-4 text-left">
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                Please click the link sent to your email or ask your system administrator to resend the invitation link.
                            </div>
                        </div>

                        <div className="mt-2 text-center">
                            <Link to="/login">
                                <Button variant="secondary" size="sm" className="w-full">
                                    Return to Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CredentialPanel>
            </div>
        );
    }

    // 2. Loading State
    if (isValidating) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <CredentialPanel
                    title="Validating Invitation"
                    subtitle="Checking authorization status..."
                >
                    <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#4C70A6]" />
                        <span>Verifying your teacher activation link...</span>
                    </div>
                </CredentialPanel>
            </div>
        );
    }

    // 3. Invalid or Expired or Revoked Token State
    if (validation && !validation.isValid) {
        const isAlreadyActive = validation.status === 'ALREADY_REGISTERED' || validation.status === 'REDEEMED';

        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <CredentialPanel
                    title={isAlreadyActive ? "Account Already Active" : "Invitation Unavailable"}
                    subtitle={isAlreadyActive ? "Your teacher profile is ready to use." : "This invitation cannot be used."}
                >
                    <div className="flex flex-col gap-4 text-left">
                        {isAlreadyActive ? (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    {validation.message || `An account for ${validation.email} has already been activated. You can sign in directly.`}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    {validation.message || "This invitation link is invalid, expired, or has already been used."}
                                </div>
                            </div>
                        )}

                        {validation.email && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                                <strong>Institutional Email:</strong> {validation.email}
                            </div>
                        )}

                        <div className="mt-2 text-center">
                            <Link to="/login">
                                <Button
                                    variant={isAlreadyActive ? "primary" : "secondary"}
                                    size="sm"
                                    className="w-full"
                                >
                                    Sign In to Your Account
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CredentialPanel>
            </div>
        );
    }

    const invitedEmail = validation?.email || "";

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Activate Teacher Account"
                subtitle="Complete your profile to create and oversee examinations."
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {submitError && (
                        <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-left flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{submitError}</span>
                        </div>
                    )}

                    {/* Readonly Invitation Email */}
                    <div className="w-full text-left">
                        <label className="text-xs font-semibold text-slate-700 select-none">
                            Authorized Email Address
                        </label>
                        <div className="w-full bg-slate-50 text-slate-700 px-3.5 py-2.5 text-sm border border-slate-200 rounded-md mt-1 font-mono">
                            {invitedEmail || "Loading email..."}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="First name"
                            name="firstName"
                            placeholder="John"
                            icon={<User className="w-4 h-4" />}
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="Last name"
                            name="lastName"
                            placeholder="Doe"
                            icon={<User className="w-4 h-4" />}
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        showPasswordToggle
                        placeholder="Minimum 8 characters"
                        icon={<Lock className="w-4 h-4" />}
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Confirm password"
                        name="confirmPassword"
                        type="password"
                        showPasswordToggle
                        placeholder="Re-enter password"
                        icon={<Lock className="w-4 h-4" />}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />

                    <Button
                        type="submit"
                        size="md"
                        loading={isRedeeming}
                        className="w-full mt-2"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                        Activate Account & Log In
                    </Button>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[#4C70A6] hover:underline font-semibold">
                            Sign in
                        </Link>
                    </div>
                </form>
            </CredentialPanel>
        </div>
    );
};