import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { Mail, Send, ArrowLeft } from "lucide-react";
import { useForgotPasswordMutation } from "@redux/services/authApi";

export const ForgotPasswordScreen: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forgotPassword] = useForgotPasswordMutation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        setIsLoading(true);
        forgotPassword({ email })
            .unwrap()
            .then(() => {
                setIsLoading(false);
                navigate("/forgot-password/success");
            })
            .catch((err) => {
                setIsLoading(false);
                setError("Failed to send reset link. Please try again.");
                console.error("Forgot password error:", err);
            });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Reset password"
                subtitle="Enter your email and we'll send a reset link."
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-[3px] text-left">
                            {error}
                        </div>
                    )}

                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@institution.edu"
                        icon={<Mail className="w-4 h-4" />}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError(null);
                        }}
                        required
                        autoFocus
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        className="w-full mt-2"
                        icon={<Send className="w-4 h-4" />}
                    >
                        Send reset link
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