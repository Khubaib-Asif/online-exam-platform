import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppSelector } from "@redux/hooks";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { Shield, Key, User, Mail, Lock, ArrowLeft } from "lucide-react";

export const BootstrapScreen: React.FC = () => {
    const navigate = useNavigate();
    const { setAuth, setBootstrapStatus } = useAppSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        deploymentSecret: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (error) setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        setIsLoading(true);
        // Simulate bootstrap submission
        setTimeout(() => {
            setIsLoading(false);
            setBootstrapStatus("INITIALISED");
            setAuth({
                user: {
                    id: "owner-01",
                    email: formData.email,
                    fullName: `${formData.firstName} ${formData.lastName}`,
                    role: "OWNER",
                    isEmailVerified: true,
                },
                accessToken: "mock-owner-access-token",
                refreshToken: "mock-owner-refresh-token",
            });
            navigate("/owner-console");
        }, 600);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="First-Run Setup"
                subtitle="Create the owner account for this deployment."
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-[3px] text-left">
                            {error}
                        </div>
                    )}

                    <Input
                        label="Deployment secret (Optional)"
                        name="deploymentSecret"
                        placeholder="SEC-BOOTSTRAP-2026"
                        icon={<Key className="w-4 h-4" />}
                        value={formData.deploymentSecret}
                        onChange={handleChange}
                    />

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
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="admin@institution.edu"
                        icon={<Mail className="w-4 h-4" />}
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

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

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        className="w-full mt-2"
                        icon={<Shield className="w-4 h-4" />}
                    >
                        Create Owner Account
                    </Button>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-1.5 text-xs text-[#4C70A6] hover:underline font-medium"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to sign in</span>
                        </Link>
                    </div>
                </form>
            </CredentialPanel>
        </div>
    );
};