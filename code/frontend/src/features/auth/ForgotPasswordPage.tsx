import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Button, Card, Divider, Input } from "../../components/ui/SharedUIs";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate("/check-email");
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-16 font-display">
            <Card className="p-10">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                            Reset Password
                        </h1>
                        <p className="text-base text-gray-700">
                            Enter your email and we'll send you a reset link.
                        </p>
                    </div>

                    <Divider className="w-full h-0.5" />

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col items-start gap-4 w-full"
                    >
                        {/* Email */}
                        <Input
                            label="Email address"
                            placeholder="you@institution.edu"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="h-xs w-10 bg-blue-500" />
                        <div className="h-xs w-10 bg-blue-500" />
                        <div className="h-xs w-10 bg-blue-500" />

                        <Button type="submit" className="w-full">
                            Send reset link
                        </Button>
                    </form>
                    <Link
                        to="/login"
                        className="w-fit self-center text-sm font-medium text-blue-500 hover:underline inline-flex items-center"
                    >
                        <ArrowLeft size={16} />Back to sign in
                    </Link>
                </div>
            </Card>
        </div>
    );
}
