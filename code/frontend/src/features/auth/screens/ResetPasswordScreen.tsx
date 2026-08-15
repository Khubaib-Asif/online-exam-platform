import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useResetPasswordMutation } from "@redux/services/authApi";

export const ResetPasswordScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetPassword] = useResetPasswordMutation();

    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (error) setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.password) {
            setError("Please enter a new password.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        resetPassword({ token: new URLSearchParams(window.location.search).get("token") || "", newPassword: formData.password })
            .unwrap()
            .then(() => {
                setIsLoading(false);
                navigate("/login");
            })
            .catch((err) => {
                setIsLoading(false);
                setError("Failed to reset password. Please try again.");
                console.error("Reset password error:", err);
            });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Set new password"
                subtitle="Enter your new password below."
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-[3px] text-left">
                            {error}
                        </div>
                    )}

                    <Input
                        label="New password"
                        name="password"
                        type="password"
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4" />}
                        helperText="Min 12 chars: uppercase, lowercase, number, special"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoFocus
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
                        Set new password
                    </Button>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1.5 text-xs text-[#4C70A6] hover:underline font-semibold"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Return to sign in</span>
                        </Link>
                    </div>
                </form>
            </CredentialPanel>
        </div>
    );
};