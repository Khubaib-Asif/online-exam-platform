import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { User, Lock, CheckCircle2 } from "lucide-react";
import { useRedeemTeacherInvitationMutation } from "@/redux/services/bootstrapApi";

export const TeacherActivationScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [redeemInvitation, { isLoading }] = useRedeemTeacherInvitationMutation();
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Missing invitation token in URL.");
            return;
        }
        if (!formData.firstName || !formData.lastName || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setError(null);
        try {
            await redeemInvitation({
                token,
                firstName: formData.firstName,
                lastName: formData.lastName,
                password: formData.password,
            }).unwrap();

            navigate("/login");
        } catch (err: any) {
            setError(err.data?.message || err.message || "Activation failed. Please check your token and try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Activate Account"
                subtitle="You've been invited as a teacher."
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-[3px] text-left">
                            {error}
                        </div>
                    )}

                    {/* Readonly Invitation Email */}
                    <div className="w-full text-left">
                        <label className="text-xs font-semibold text-slate-700 select-none">
                            Invitation Email
                        </label>
                        <div className="w-full bg-slate-50 text-slate-700 px-3.5 py-2.5 text-sm border border-slate-200 rounded-[3px] mt-1 font-mono">
                            {formData.email}
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
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4" />}
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Confirm password"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4" />}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        className="w-full mt-2"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                        Activate Account
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