import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CredentialPanel } from "@components/credential-panel/CredentialPanel";
import { setAuth } from "@redux/slices/authSlice";
import { useAppDispatch } from "@redux/hooks";
import { type SystemRole } from "@redux/slices/authSlice";
import { Input } from "@components/ui/Input";
import { Button } from "@components/ui/Button";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import { useLoginMutation } from "@/redux/services/authApi";

export const LoginScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [login] = useLoginMutation();
    const dispatch = useAppDispatch();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        keepSignedIn: false,
        selectedRole: "STUDENT" as SystemRole,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData((prev) => ({ ...prev, [e.target.name]: value }));
        if (error) setError(null);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError("Please enter your institutional email and password.");
            return;
        }
        setIsLoading(true);
        login({
            email: formData.email,
            password: formData.password,
        })
            .unwrap()
            .then((response) => {
                dispatch(setAuth({
                    user: response.user,
                    accessToken: response.accessToken,
                }));
                if (formData.keepSignedIn) {
                    localStorage.setItem("accessToken", response.accessToken);
                } else {
                    sessionStorage.setItem("accessToken", response.accessToken);
                }
                console.log("Login attempt with email:", formData.email, "and role:", formData.selectedRole);
                console.log("Response from login mutation:", response);
                navigate("/dashboard");
            })
            .catch((err) => {
                console.error("Login error:", err);
                setError(err.data?.message || "An unexpected error occurred. Please try again.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <CredentialPanel
                title="Sign in to your account"
                subtitle="Use your institutional credentials to access your examinations."
            >
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 text-xs bg-rose-50/80 text-rose-800 border border-rose-200/80 rounded-md text-left flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        placeholder="you@institution.edu"
                        icon={<Mail className="w-4 h-4 text-slate-400" />}
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoFocus
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="••••••••••••"
                        icon={<Lock className="w-4 h-4 text-slate-400" />}
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <div className="flex items-center justify-between text-xs my-0.5">
                        <label className="flex items-center gap-2 text-slate-600 select-none cursor-pointer">
                            <input
                                type="checkbox"
                                name="keepSignedIn"
                                checked={formData.keepSignedIn}
                                onChange={handleChange}
                                className="w-3.5 h-3.5 text-[#4C70A6] border-slate-300 rounded focus:ring-[#4C70A6]"
                            />
                            <span>Keep me signed in</span>
                        </label>

                        <Link
                            to="/forgot-password"
                            className="text-[#4C70A6] hover:underline font-semibold"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Quick Demo Role Selector */}
                    <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-md p-3 my-1">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1.5 uppercase tracking-wider">
                            Role Switcher (Demo Context):
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {(["STUDENT", "TEACHER", "OWNER", "PROCTOR"] as SystemRole[]).map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, selectedRole: r }))}
                                    className={`py-1.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${formData.selectedRole === r
                                        ? "bg-[#4C70A6] text-white border-[#4C70A6] shadow-2xs"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        className="w-full mt-1 bg-[#4C70A6] hover:bg-[#3F5E8E] text-white py-3 font-semibold shadow-xs"
                        icon={<LogIn className="w-4 h-4" />}
                    >
                        Sign in
                    </Button>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                        Don't have a student account?{" "}
                        <Link to="/signup" className="text-[#4C70A6] hover:underline font-semibold">
                            Create student account
                        </Link>
                    </div>
                </form>
            </CredentialPanel>
        </div>
    );
};

