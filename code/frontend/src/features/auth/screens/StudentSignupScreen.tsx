import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { User, Mail, Lock, Camera, UserPlus, AlertCircle } from "lucide-react";
import { useRegisterMutation } from "@redux/services/authApi";

export const StudentSignupScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [register] = useRegisterMutation();
    const [formData, setFormData] = useState({
        ProfilePic: null as File | null,
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        agreeTerms: false,
    });

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [e.target.name]: value }));
        if (error) setError(null);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError("Please fill in all required profile fields.");
            return;
        }
        if (!formData.agreeTerms) {
            setError("You must agree to the Terms of Service and Privacy Policy.");
            return;
        }

        setIsLoading(true);
        register({
            ...formData,
            ProfilePic: formData.ProfilePic,
        })
            .unwrap()
            .then(() => {
                setIsLoading(false);
                navigate("/verify-email-nag");
            })
            .catch((err) => {
                setIsLoading(false);
                setError("Failed to create account. Please try again.");
                console.log("Registration error:", err);
            });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Create student account"
                subtitle="Sign up for institutional examination access."
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 text-xs bg-rose-50/80 text-rose-800 border border-rose-200/80 rounded-md text-left flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Profile Photo Upload Box */}
                    <div className="w-full text-left">
                        <label className="text-xs font-semibold text-slate-700 select-none block mb-1.5">
                            Required Profile Photo Enrolment
                        </label>
                        <label className="relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-[#4C70A6] rounded-md bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden">
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    alt="Profile preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center gap-2.5 text-slate-400 p-4">
                                    <Camera className="w-5 h-5 text-slate-400 shrink-0" />
                                    <span className="text-xs text-slate-500 font-normal">
                                        Click to upload face photo for identity verification
                                    </span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="First name"
                            name="firstName"
                            placeholder="John"
                            icon={<User className="w-4 h-4 text-slate-400" />}
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />

                        <Input
                            label="Last name"
                            name="lastName"
                            placeholder="Doe"
                            icon={<User className="w-4 h-4 text-slate-400" />}
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Input
                        label="Institutional Email"
                        name="email"
                        type="email"
                        placeholder="you@institution.edu"
                        icon={<Mail className="w-4 h-4 text-slate-400" />}
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4 text-slate-400" />}
                        helperText="Min 12 chars: uppercase, lowercase, number, special"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <label className="flex items-start gap-2 text-xs text-slate-600 text-left my-0.5 select-none cursor-pointer">
                        <input
                            type="checkbox"
                            name="agreeTerms"
                            checked={formData.agreeTerms}
                            onChange={handleChange}
                            className="mt-0.5 w-3.5 h-3.5 text-[#4C70A6] border-slate-300 rounded focus:ring-[#4C70A6]"
                            required
                        />
                        <span>I agree to the Terms of Service and Privacy Policy</span>
                    </label>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        className="w-full mt-2 bg-[#4C70A6] hover:bg-[#3F5E8E] text-white py-3 font-semibold shadow-xs"
                        icon={<UserPlus className="w-4 h-4" />}
                    >
                        Create account
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