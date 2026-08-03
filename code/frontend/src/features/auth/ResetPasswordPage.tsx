import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button, Card, Divider, Input } from "../../components/ui/SharedUIs";

// const PASSWORD_RULES = [
//     "At least 12 characters",
//     "Uppercase and lowercase letters",
//     "At least one number",
//     "At least one special character",
// ];

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate("/login");
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <Card className="p-10">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Set new password
                        </h1>
                        <p className="text-base text-gray-700">
                            Enter your new password below.
                        </p>
                    </div>

                    <Divider className="w-full h-0.5" />

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col items-start gap-3"
                    >
                        {/* New password */}
                        <Input
                            label="New password"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <p className="text-sm text-gray-400">
                            Min 12 chars: uppercase, lowercase, number, special
                        </p>

                        {/* Password rules */}
                        {/* <div className="flex w-110 flex-col gap-1 rounded-xs bg-gray-50 px-4 py-3">
                            {PASSWORD_RULES.map((rule) => (
                                <div key={rule} className="flex items-center gap-2">
                                    <Check size={12} className="text-gray-700" />
                                    <span className="text-[13px] text-gray-700">{rule}</span>
                                </div>
                            ))}
                        </div> */}

                        {/* Confirm password */}
                        <Input
                            label="Confirm password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <Button variant="primary" fullWidth type="submit" onClick={handleSubmit}>
                            Set new password
                        </Button>
                    </form>

                    <p className="text-sm text-gray-400">
                        Remember your password?
                        <Link
                            to="/login"
                            className="font-medium text-blue-500 hover:underline"
                        >
                            Back to sign in
                        </Link>
                    </p>
                </div>
            </Card>
        </div>
    );
}
